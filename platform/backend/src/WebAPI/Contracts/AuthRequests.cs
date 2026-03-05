using System.ComponentModel.DataAnnotations;

namespace Platform.WebAPI.Contracts;

public sealed record LoginRequest(
    [property: Required, MinLength(3), MaxLength(64)] string UserName,
    [property: Required, MinLength(8), MaxLength(128)] string Password,
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MinLength(4), MaxLength(12)] string EmailCode);

public sealed record RefreshRequest(
    [property: Required, MinLength(16), MaxLength(512)] string RefreshToken);

public sealed record RequestEmailCodeRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email);

public sealed record ConfirmSessionRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MinLength(4), MaxLength(12)] string EmailCode);

public sealed record ChangePasswordRequest(
    [property: Required, MinLength(8), MaxLength(128)] string OldPassword,
    [property: Required, MinLength(8), MaxLength(128)] string NewPassword,
    [property: Required, MinLength(4), MaxLength(12)] string EmailCode);
