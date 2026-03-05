using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using Platform.Core.Contracts.Auth;

namespace Platform.Infrastructure.Security;

public sealed class AdminSecurityService(
    IConfiguration configuration,
    IOptions<AdminSecurityOptions> adminOptionsAccessor,
    IOptions<EmailVerificationOptions> emailOptionsAccessor,
    ILogger<AdminSecurityService> logger) : IAdminSecurityService
{
    private readonly AdminSecurityOptions _adminOptions = adminOptionsAccessor.Value;
    private readonly EmailVerificationOptions _emailOptions = emailOptionsAccessor.Value;
    private readonly string? _connectionString = configuration.GetConnectionString("Platform");
    private readonly object _sync = new();
    private byte[] _salt = Array.Empty<byte>();
    private string _passwordHash = string.Empty;
    private string? _loginEmailCodeHash;
    private DateTimeOffset _loginEmailCodeExpiresAtUtc;
    private string? _passwordEmailCodeHash;
    private DateTimeOffset _passwordEmailCodeExpiresAtUtc;

    public bool ValidateCredentials(string userName, string password)
    {
        EnsureInitialized();
        if (!string.Equals(userName?.Trim(), _adminOptions.UserName, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return VerifyPassword(password, _passwordHash, _salt);
    }

    public bool ValidateLoginEmailCode(string email, string code)
    {
        EnsureInitialized();
        if (!string.Equals(email?.Trim(), _adminOptions.Email, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        lock (_sync)
        {
            return VerifyCode(code, _loginEmailCodeHash, _loginEmailCodeExpiresAtUtc);
        }
    }

    public Task<RequestEmailCodeResult> RequestLoginEmailCodeAsync(string email, string remoteIp, CancellationToken cancellationToken = default)
    {
        return RequestEmailCodeCoreAsync(
            email: email,
            remoteIp: remoteIp,
            subject: "Grummm admin: код подтверждения входа",
            reasonLabel: "входа",
            target: "login",
            cancellationToken: cancellationToken);
    }

    public Task<RequestEmailCodeResult> RequestPasswordEmailCodeAsync(string email, string remoteIp, CancellationToken cancellationToken = default)
    {
        return RequestEmailCodeCoreAsync(
            email: email,
            remoteIp: remoteIp,
            subject: "Grummm admin: код подтверждения",
            reasonLabel: "смены пароля",
            target: "password",
            cancellationToken: cancellationToken);
    }

    private async Task<RequestEmailCodeResult> RequestEmailCodeCoreAsync(
        string email,
        string remoteIp,
        string subject,
        string reasonLabel,
        string target,
        CancellationToken cancellationToken)
    {
        EnsureInitialized();
        if (!string.Equals(email?.Trim(), _adminOptions.Email, StringComparison.OrdinalIgnoreCase))
        {
            return new RequestEmailCodeResult(false, ErrorCode: "invalid_email");
        }

        var code = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
        lock (_sync)
        {
            if (target == "login")
            {
                _loginEmailCodeHash = ComputeSha256(code);
                _loginEmailCodeExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(10);
            }
            else
            {
                _passwordEmailCodeHash = ComputeSha256(code);
                _passwordEmailCodeExpiresAtUtc = DateTimeOffset.UtcNow.AddMinutes(10);
            }
        }

        var body = $"""
                    Код подтверждения для {reasonLabel} Grummm: {code}
                    Код действует 10 минут.
                    IP запроса: {remoteIp}
                    """;

        if (!_emailOptions.Enabled)
        {
            logger.LogWarning(
                "EmailVerification disabled ({Target}). Code for {Email} (for debug only): {Code}",
                target,
                email,
                code);
            return new RequestEmailCodeResult(true, DebugCode: code);
        }

        try
        {
            using var smtp = new SmtpClient(_emailOptions.SmtpHost, _emailOptions.SmtpPort)
            {
                EnableSsl = _emailOptions.UseSsl,
                Credentials = new NetworkCredential(_emailOptions.SmtpUser, _emailOptions.SmtpPassword)
            };
            using var message = new MailMessage(
                from: _emailOptions.FromEmail,
                to: email.Trim(),
                subject: subject,
                body: body);

            await smtp.SendMailAsync(message, cancellationToken);
            return new RequestEmailCodeResult(true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email verification code.");
            if (ex is SmtpException smtpException &&
                smtpException.Message.Contains("Application password is REQUIRED", StringComparison.OrdinalIgnoreCase))
            {
                return new RequestEmailCodeResult(false, ErrorCode: "mailru_app_password_required");
            }

            return new RequestEmailCodeResult(false, ErrorCode: "email_send_failed");
        }
    }

    public ChangePasswordResult ChangePassword(string userName, string oldPassword, string newPassword, string emailCode)
    {
        EnsureInitialized();
        if (!string.Equals(userName?.Trim(), _adminOptions.UserName, StringComparison.OrdinalIgnoreCase))
        {
            return new ChangePasswordResult(false, "invalid_user");
        }

        if (!VerifyPassword(oldPassword, _passwordHash, _salt))
        {
            return new ChangePasswordResult(false, "invalid_old_password");
        }

        if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 8)
        {
            return new ChangePasswordResult(false, "weak_new_password");
        }

        lock (_sync)
        {
            if (!VerifyCode(emailCode, _passwordEmailCodeHash, _passwordEmailCodeExpiresAtUtc))
            {
                return new ChangePasswordResult(false, "invalid_email_code");
            }
        }

        lock (_sync)
        {
            _salt = RandomNumberGenerator.GetBytes(16);
            _passwordHash = HashPassword(newPassword, _salt);
            _passwordEmailCodeHash = null;
            _passwordEmailCodeExpiresAtUtc = DateTimeOffset.MinValue;
            SavePasswordStateToDbUnsafe();
        }

        return new ChangePasswordResult(true);
    }

    private static bool VerifyCode(string code, string? expectedCodeHash, DateTimeOffset expiresAtUtc)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return false;
        }

        if (expectedCodeHash is null || DateTimeOffset.UtcNow > expiresAtUtc)
        {
            return false;
        }

        return string.Equals(expectedCodeHash, ComputeSha256(code.Trim()), StringComparison.Ordinal);
    }

    private void EnsureInitialized()
    {
        if (!string.IsNullOrWhiteSpace(_passwordHash))
        {
            return;
        }

        lock (_sync)
        {
            if (!string.IsNullOrWhiteSpace(_passwordHash))
            {
                return;
            }

            if (!TryLoadPasswordStateFromDbUnsafe())
            {
                _salt = RandomNumberGenerator.GetBytes(16);
                _passwordHash = HashPassword(_adminOptions.Password, _salt);
                SavePasswordStateToDbUnsafe();
            }
        }
    }

    private bool TryLoadPasswordStateFromDbUnsafe()
    {
        var connectionString = RequireConnectionString();

        try
        {
            using var connection = new NpgsqlConnection(connectionString);
            connection.Open();
            EnsurePasswordTableExists(connection);

            using var command = connection.CreateCommand();
            command.CommandText = """
                select password_hash, salt_base64
                from admin_security_credentials
                where user_name = @user_name
                limit 1;
                """;
            command.Parameters.AddWithValue("user_name", _adminOptions.UserName);

            using var reader = command.ExecuteReader();
            if (!reader.Read())
            {
                return false;
            }

            var passwordHash = reader.GetString(0);
            var saltBase64 = reader.GetString(1);
            var salt = Convert.FromBase64String(saltBase64);
            if (string.IsNullOrWhiteSpace(passwordHash) || salt.Length == 0)
            {
                return false;
            }

            _passwordHash = passwordHash;
            _salt = salt;
            return true;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load admin password state from database.");
            throw;
        }
    }

    private void SavePasswordStateToDbUnsafe()
    {
        var connectionString = RequireConnectionString();

        try
        {
            using var connection = new NpgsqlConnection(connectionString);
            connection.Open();
            EnsurePasswordTableExists(connection);

            using var command = connection.CreateCommand();
            command.CommandText = """
                insert into admin_security_credentials (user_name, password_hash, salt_base64, updated_at_utc)
                values (@user_name, @password_hash, @salt_base64, now())
                on conflict (user_name)
                do update set
                    password_hash = excluded.password_hash,
                    salt_base64 = excluded.salt_base64,
                    updated_at_utc = excluded.updated_at_utc;
                """;
            command.Parameters.AddWithValue("user_name", _adminOptions.UserName);
            command.Parameters.AddWithValue("password_hash", _passwordHash);
            command.Parameters.AddWithValue("salt_base64", Convert.ToBase64String(_salt));
            command.ExecuteNonQuery();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to save admin password state to database.");
            throw;
        }
    }

    private static void EnsurePasswordTableExists(NpgsqlConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            create table if not exists admin_security_credentials (
                user_name text primary key,
                password_hash text not null,
                salt_base64 text not null,
                updated_at_utc timestamptz not null default now()
            );
            """;
        command.ExecuteNonQuery();
    }

    private string RequireConnectionString()
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("Connection string 'Platform' is missing for admin security persistence.");
        }

        return _connectionString;
    }

    private static string HashPassword(string password, byte[] salt)
    {
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password: password,
            salt: salt,
            iterations: 120_000,
            hashAlgorithm: HashAlgorithmName.SHA256,
            outputLength: 32);

        return Convert.ToBase64String(hash);
    }

    private static bool VerifyPassword(string password, string expectedHash, byte[] salt)
    {
        if (string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(expectedHash))
        {
            return false;
        }

        var computed = HashPassword(password, salt);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computed),
            Encoding.UTF8.GetBytes(expectedHash));
    }

    private static string ComputeSha256(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }
}
