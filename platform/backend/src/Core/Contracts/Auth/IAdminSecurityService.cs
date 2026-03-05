namespace Platform.Core.Contracts.Auth;

public interface IAdminSecurityService
{
    bool ValidateCredentials(string userName, string password);
    Task<RequestEmailCodeResult> RequestLoginEmailCodeAsync(string email, string remoteIp, CancellationToken cancellationToken = default);
    bool ValidateLoginEmailCode(string email, string code);
    Task<RequestEmailCodeResult> RequestPasswordEmailCodeAsync(string email, string remoteIp, CancellationToken cancellationToken = default);
    ChangePasswordResult ChangePassword(string userName, string oldPassword, string newPassword, string emailCode);
}

public sealed record ChangePasswordResult(bool Success, string? ErrorCode = null);
public sealed record RequestEmailCodeResult(bool Success, string? DebugCode = null, string? ErrorCode = null);
