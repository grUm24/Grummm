using Microsoft.AspNetCore.Antiforgery;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;
using Npgsql;
using Platform.WebAPI.Middleware;
using Platform.Core.Contracts.Auth;
using Platform.Infrastructure.Extensions;
using Platform.Infrastructure.Security;
using Platform.WebAPI.Contracts;
using Platform.WebAPI.Extensions;
using Platform.WebAPI.Services;
using Platform.WebAPI.Security;
using Platform.WebAPI.Validation;

var builder = WebApplication.CreateBuilder(args);

const long maxRequestBodySizeBytes = 100L * 1024 * 1024;

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = maxRequestBodySizeBytes;
});

builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(options =>
{
    options.IncludeScopes = true;
    options.SingleLine = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ ";
});
builder.Services.AddProblemDetails();
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = maxRequestBodySizeBytes;
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            }));

    options.AddPolicy("auth-login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            }));

    options.AddPolicy("auth-refresh", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
                AutoReplenishment = true,
                QueueLimit = 0
            }));

    options.AddPolicy("auth-email-code", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                AutoReplenishment = true,
                QueueLimit = 0
            }));

    options.AddPolicy("auth-change-password", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 3,
                Window = TimeSpan.FromMinutes(10),
                AutoReplenishment = true,
                QueueLimit = 0
            }));
});
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.Name = "__Host-platform-csrf";
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.HttpOnly = true;
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
});
builder.Services.Configure<CookiePolicyOptions>(options =>
{
    options.MinimumSameSitePolicy = SameSiteMode.Strict;
    options.HttpOnly = Microsoft.AspNetCore.CookiePolicy.HttpOnlyPolicy.Always;
    options.Secure = CookieSecurePolicy.Always;
});
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection("Jwt"))
    .ValidateOnStart();
builder.Services.AddSingleton<IValidateOptions<JwtOptions>, JwtOptionsValidator>();
builder.Services.Configure<AuthCookieOptions>(builder.Configuration.GetSection("AuthCookies"));
builder.Services.Configure<AdminSecurityOptions>(builder.Configuration.GetSection("AdminSecurity"));
builder.Services.Configure<EmailVerificationOptions>(builder.Configuration.GetSection("EmailVerification"));
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IRefreshTokenStore, InMemoryRefreshTokenStore>();
builder.Services.AddSingleton<IRefreshTokenService, RefreshTokenService>();
builder.Services.AddSingleton<IAdminSecurityService, AdminSecurityService>();
builder.Services.AddSingleton<IAdminAnalyticsService, AdminAnalyticsService>();
builder.Services.AddSingleton<IEmailCodeThrottleService, EmailCodeThrottleService>();
builder.Services.AddSingleton<ILoginAttemptService, InMemoryLoginAttemptService>();
builder.Services.AddModuleDatabaseRegistry();
builder.Services.AddAuditLogging(builder.Configuration);
builder.Services.AddPlatformModules();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
    {
        policy.RequireAuthenticatedUser();
        policy.RequireRole("Admin");
    });
});

var app = builder.Build();
app.UseForwardedHeaders();

app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCookiePolicy();
app.UseRateLimiter();
app.UseMiddleware<JwtAuthenticationMiddleware>();
app.UseMiddleware<CsrfProtectionMiddleware>();
app.UseAuthorization();
app.UseMiddleware<AdminAuditLoggingMiddleware>();

app.MapGet("/health", (HttpContext context) => Results.Ok(new
{
    status = "healthy",
    service = "Platform.WebAPI",
    correlationId = context.TraceIdentifier
}));

app.MapGet("/ready", async (IConfiguration configuration, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    var connectionString = configuration.GetConnectionString("Platform");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return Results.Json(new
        {
            status = "not_ready",
            checks = new { database = "connection_string_missing" }
        }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    try
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await using var command = new NpgsqlCommand("select 1", connection);
        await command.ExecuteScalarAsync(cancellationToken);

        return Results.Ok(new
        {
            status = "ready",
            checks = new { database = "ok" }
        });
    }
    catch (Exception exception)
    {
        logger.LogWarning(exception, "Readiness check failed: database is unavailable.");
        return Results.Json(new
        {
            status = "not_ready",
            checks = new { database = "unavailable" }
        }, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
});

app.MapGet("/", (HttpContext context) =>
{
    return Results.Ok(new
    {
        service = "Platform.WebAPI",
        message = "Backend core skeleton is running",
        correlationId = context.TraceIdentifier
    });
});

var publicApi = app.MapGroup("/api/public");
var privateApi = app.MapGroup("/api/app").RequireAuthorization("AdminOnly");

var publicAuth = publicApi.MapGroup("/auth");
var privateAuth = privateApi.MapGroup("/auth");
var publicSecurity = publicApi.MapGroup("/security");
var publicAnalytics = publicApi.MapGroup("/analytics");
var privateAnalytics = privateApi.MapGroup("/analytics");

publicSecurity.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
{
    var tokens = antiforgery.GetAndStoreTokens(context);
    return Results.Ok(new
    {
        csrfHeaderName = "X-CSRF-TOKEN",
        requestToken = tokens.RequestToken
    });
});

publicAnalytics.MapPost("/track-site-visit", async (
    HttpContext context,
    IAdminAnalyticsService analyticsService,
    CancellationToken cancellationToken) =>
{
    var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    await analyticsService.TrackSiteVisitAsync(remoteIp, cancellationToken);
    return Results.Accepted();
});

publicAnalytics.MapPost("/track-post-view/{postId}", async (
    string postId,
    IAdminAnalyticsService analyticsService,
    CancellationToken cancellationToken) =>
{
    await analyticsService.TrackPostViewAsync(postId, cancellationToken);
    return Results.Accepted();
});

privateAnalytics.MapGet("/overview", async (
    IAdminAnalyticsService analyticsService,
    CancellationToken cancellationToken) =>
{
    var overview = await analyticsService.GetOverviewAsync(cancellationToken);
    return Results.Ok(overview);
});

publicAuth.MapPost("/login", async (
    HttpContext context,
    LoginRequest request,
    IRefreshTokenService refreshTokenService,
    IOptions<AuthCookieOptions> authCookieOptions,
    IAdminSecurityService adminSecurityService,
    ILoginAttemptService loginAttemptService) =>
{
    RequestValidator.Validate(request);
    var command = AuthMappings.ToCommand(request);
    var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    if (loginAttemptService.IsBlocked(remoteIp, out var retryAfterSeconds))
    {
        return Results.Json(new
        {
            error = "login_temporarily_blocked",
            retryAfterSeconds
        }, statusCode: StatusCodes.Status429TooManyRequests);
    }

    var isValidCredentials = adminSecurityService.ValidateCredentials(command.UserName, command.Password);
    if (!isValidCredentials)
    {
        loginAttemptService.RegisterFailure(remoteIp);
        return Results.Unauthorized();
    }

    var isValidEmailCode = adminSecurityService.ValidateLoginEmailCode(command.Email, command.EmailCode);
    if (!isValidEmailCode)
    {
        loginAttemptService.RegisterFailure(remoteIp);
        return Results.BadRequest(new { error = "invalid_email_code" });
    }

    loginAttemptService.Reset(remoteIp);

    var user = new AuthUser(
        UserId: Guid.NewGuid().ToString("N"),
        UserName: command.UserName,
        Role: "Admin");

    var tokens = await refreshTokenService.IssueAsync(user);
    context.Response.SetRefreshTokenCookie(tokens, authCookieOptions);
    return Results.Ok(new
    {
        accessToken = tokens.AccessToken,
        accessTokenExpiresAtUtc = tokens.AccessTokenExpiresAtUtc
    });
}).RequireRateLimiting("auth-login");

publicAuth.MapPost("/request-login-email-code", async (
    HttpContext context,
    RequestEmailCodeRequest request,
    IAdminSecurityService adminSecurityService,
    IEmailCodeThrottleService emailCodeThrottleService,
    CancellationToken cancellationToken) =>
{
    RequestValidator.Validate(request);
    var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    if (!emailCodeThrottleService.TryConsume(remoteIp, out var retryAfterSeconds))
    {
        return Results.Json(new
        {
            error = "email_code_rate_limited",
            retryAfterSeconds
        }, statusCode: StatusCodes.Status429TooManyRequests);
    }

    var result = await adminSecurityService.RequestLoginEmailCodeAsync(request.Email, remoteIp, cancellationToken);
    if (!result.Success)
    {
        return Results.BadRequest(new { error = result.ErrorCode ?? "email_code_request_failed" });
    }

    return Results.Ok(new { status = "email_code_sent", debugCode = result.DebugCode });
}).RequireRateLimiting("auth-email-code");

publicAuth.MapPost("/confirm-session", async (
    HttpContext context,
    ConfirmSessionRequest request,
    IRefreshTokenService refreshTokenService,
    IOptions<AuthCookieOptions> authCookieOptions,
    IAdminSecurityService adminSecurityService) =>
{
    RequestValidator.Validate(request);

    var isValidEmailCode = adminSecurityService.ValidateLoginEmailCode(request.Email, request.EmailCode);
    if (!isValidEmailCode)
    {
        return Results.BadRequest(new { error = "invalid_email_code" });
    }

    var refreshToken = context.Request.GetRefreshTokenFromCookie(authCookieOptions);
    if (string.IsNullOrWhiteSpace(refreshToken))
    {
        return Results.BadRequest(new { error = "refresh_token_required" });
    }

    var result = await refreshTokenService.RotateAsync(refreshToken);
    if (!result.Success || result.Tokens is null)
    {
        context.Response.DeleteRefreshTokenCookie(authCookieOptions);
        return Results.Unauthorized();
    }

    context.Response.SetRefreshTokenCookie(result.Tokens, authCookieOptions);
    return Results.Ok(new
    {
        accessToken = result.Tokens.AccessToken,
        accessTokenExpiresAtUtc = result.Tokens.AccessTokenExpiresAtUtc
    });
}).RequireRateLimiting("auth-refresh");

publicAuth.MapPost("/refresh", async (HttpContext context, RefreshRequest? request, IRefreshTokenService refreshTokenService, IOptions<AuthCookieOptions> authCookieOptions) =>
{
    if (request is not null)
    {
        RequestValidator.Validate(request);
    }

    var refreshToken = context.Request.GetRefreshTokenFromCookie(authCookieOptions) ?? request?.RefreshToken;
    if (string.IsNullOrWhiteSpace(refreshToken))
    {
        return Results.BadRequest(new { error = "refresh_token_required" });
    }

    var result = await refreshTokenService.RotateAsync(refreshToken);
    if (!result.Success || result.Tokens is null)
    {
        context.Response.DeleteRefreshTokenCookie(authCookieOptions);
        return Results.Unauthorized();
    }

    context.Response.SetRefreshTokenCookie(result.Tokens, authCookieOptions);
    return Results.Ok(new
    {
        accessToken = result.Tokens.AccessToken,
        accessTokenExpiresAtUtc = result.Tokens.AccessTokenExpiresAtUtc
    });
}).RequireRateLimiting("auth-refresh");

privateAuth.MapPost("/logout", async (HttpContext context, RefreshRequest? request, IRefreshTokenService refreshTokenService, IOptions<AuthCookieOptions> authCookieOptions) =>
{
    if (request is not null)
    {
        RequestValidator.Validate(request);
    }

    var refreshToken = context.Request.GetRefreshTokenFromCookie(authCookieOptions) ?? request?.RefreshToken;
    if (string.IsNullOrWhiteSpace(refreshToken))
    {
        context.Response.DeleteRefreshTokenCookie(authCookieOptions);
        return Results.NoContent();
    }

    var revoked = await refreshTokenService.RevokeAsync(refreshToken);
    context.Response.DeleteRefreshTokenCookie(authCookieOptions);
    return revoked ? Results.NoContent() : Results.NotFound();
});

privateAuth.MapPost("/request-email-code", async (
    HttpContext context,
    RequestEmailCodeRequest request,
    IAdminSecurityService adminSecurityService,
    CancellationToken cancellationToken) =>
{
    RequestValidator.Validate(request);
    var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    var result = await adminSecurityService.RequestPasswordEmailCodeAsync(request.Email, remoteIp, cancellationToken);
    if (!result.Success)
    {
        return Results.BadRequest(new { error = result.ErrorCode ?? "email_code_request_failed" });
    }

    return Results.Ok(new { status = "email_code_sent", debugCode = result.DebugCode });
}).RequireRateLimiting("auth-email-code");

privateAuth.MapPost("/change-password", (HttpContext context, ChangePasswordRequest request, IAdminSecurityService adminSecurityService) =>
{
    RequestValidator.Validate(request);
    var userName = context.User.Identity?.Name ?? string.Empty;
    var result = adminSecurityService.ChangePassword(
        userName: userName,
        oldPassword: request.OldPassword,
        newPassword: request.NewPassword,
        emailCode: request.EmailCode);

    if (!result.Success)
    {
        return Results.BadRequest(new { error = result.ErrorCode ?? "change_password_failed" });
    }

    return Results.Ok(new { status = "password_changed" });
}).RequireRateLimiting("auth-change-password");

app.MapModules();

app.Run();
