using Microsoft.AspNetCore.Antiforgery;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Npgsql;
using Platform.WebAPI.Middleware;
using Platform.Core.Contracts.Auth;
using Platform.Infrastructure.Extensions;
using Platform.Infrastructure.Security;
using Platform.WebAPI.Contracts;
using Platform.WebAPI.Extensions;
using Platform.WebAPI.Validation;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddSimpleConsole(options =>
{
    options.IncludeScopes = true;
    options.SingleLine = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ ";
});
builder.Services.AddProblemDetails();
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
builder.Services.AddSingleton<IJwtTokenService, JwtTokenService>();
builder.Services.AddSingleton<IRefreshTokenStore, InMemoryRefreshTokenStore>();
builder.Services.AddSingleton<IRefreshTokenService, RefreshTokenService>();
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

publicSecurity.MapGet("/csrf", (HttpContext context, IAntiforgery antiforgery) =>
{
    var tokens = antiforgery.GetAndStoreTokens(context);
    return Results.Ok(new
    {
        csrfHeaderName = "X-CSRF-TOKEN",
        requestToken = tokens.RequestToken
    });
});

publicAuth.MapPost("/login", async (HttpContext context, LoginRequest request, IRefreshTokenService refreshTokenService, IOptions<AuthCookieOptions> authCookieOptions) =>
{
    RequestValidator.Validate(request);
    var command = AuthMappings.ToCommand(request);

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

app.MapModules();

app.Run();
