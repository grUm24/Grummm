using Microsoft.Extensions.Options;
using Platform.Core.Contracts.Auth;
using Platform.WebAPI.Contracts;

namespace Platform.WebAPI.Extensions;

public static class AuthCookieExtensions
{
    public static void SetRefreshTokenCookie(this HttpResponse response, TokenPair tokens, IOptions<AuthCookieOptions> options)
    {
        var cookieOptions = BuildCookieOptions(tokens.RefreshTokenExpiresAtUtc, options.Value);
        response.Cookies.Append(options.Value.RefreshTokenCookieName, tokens.RefreshToken, cookieOptions);
    }

    public static string? GetRefreshTokenFromCookie(this HttpRequest request, IOptions<AuthCookieOptions> options)
    {
        return request.Cookies.TryGetValue(options.Value.RefreshTokenCookieName, out var value)
            ? value
            : null;
    }

    public static void DeleteRefreshTokenCookie(this HttpResponse response, IOptions<AuthCookieOptions> options)
    {
        var resolvedPath = ResolveCookiePath(options.Value);
        response.Cookies.Delete(options.Value.RefreshTokenCookieName, new CookieOptions
        {
            Path = resolvedPath,
            HttpOnly = true,
            Secure = true,
            SameSite = options.Value.UseStrictSameSite ? SameSiteMode.Strict : SameSiteMode.Lax
        });
    }

    private static CookieOptions BuildCookieOptions(DateTime expiresAtUtc, AuthCookieOptions options)
    {
        var resolvedPath = ResolveCookiePath(options);

        return new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = options.UseStrictSameSite ? SameSiteMode.Strict : SameSiteMode.Lax,
            Expires = new DateTimeOffset(expiresAtUtc),
            Path = resolvedPath,
            IsEssential = true
        };
    }

    private static string ResolveCookiePath(AuthCookieOptions options)
    {
        if (options.RefreshTokenCookieName.StartsWith("__Host-", StringComparison.Ordinal))
        {
            return "/";
        }

        return string.IsNullOrWhiteSpace(options.Path) ? "/" : options.Path;
    }
}
