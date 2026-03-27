using System.Data.Common;
using System.Diagnostics;
using System.Globalization;
using System.IO.Compression;
using Microsoft.Extensions.Configuration;
using Platform.Modules.PlatformOps.Application.Commands;
using Platform.Modules.PlatformOps.Application.Repositories;
using Platform.Modules.PlatformOps.Contracts;

namespace Platform.Modules.PlatformOps.Infrastructure.Repositories;

public sealed class FileSystemPlatformOpsRepository(IConfiguration configuration) : IPlatformOpsRepository
{
    private const string ProjectStoragePath = "/var/projects";
    private const string BackupDirectoryPath = "/var/backups/platform/postgres";
    private readonly string? _connectionString = configuration.GetConnectionString("Platform");

    public Task<PlatformOpsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var overview = new PlatformOpsOverviewDto(GetStorage(), GetBackupStatus());
        return Task.FromResult(overview);
    }

    public async Task<PlatformDatabaseBackupResult> CreateDatabaseBackupAsync(CancellationToken cancellationToken = default)
    {
        var connection = ParseConnectionString(_connectionString);
        Directory.CreateDirectory(BackupDirectoryPath);

        var createdAtUtc = DateTimeOffset.UtcNow;
        var fileName = $"platform_{createdAtUtc:yyyyMMddTHHmmssZ}.sql.gz";
        var filePath = Path.Combine(BackupDirectoryPath, fileName);

        var startInfo = new ProcessStartInfo("pg_dump")
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        startInfo.ArgumentList.Add("--host");
        startInfo.ArgumentList.Add(connection.Host);
        startInfo.ArgumentList.Add("--port");
        startInfo.ArgumentList.Add(connection.Port.ToString(CultureInfo.InvariantCulture));
        startInfo.ArgumentList.Add("--username");
        startInfo.ArgumentList.Add(connection.UserName);
        startInfo.ArgumentList.Add("--dbname");
        startInfo.ArgumentList.Add(connection.Database);
        startInfo.ArgumentList.Add("--no-owner");
        startInfo.ArgumentList.Add("--no-privileges");
        startInfo.Environment["PGPASSWORD"] = connection.Password;

        using var process = new Process { StartInfo = startInfo };
        try
        {
            if (!process.Start())
            {
                throw new InvalidOperationException("pg_dump did not start.");
            }
        }
        catch (Exception exception)
        {
            throw new InvalidOperationException("Failed to start pg_dump. Ensure postgresql-client is installed in the backend runtime.", exception);
        }

        var standardErrorTask = process.StandardError.ReadToEndAsync();

        await using (var targetStream = File.Create(filePath))
        await using (var gzipStream = new GZipStream(targetStream, CompressionLevel.Optimal, leaveOpen: true))
        {
            await process.StandardOutput.BaseStream.CopyToAsync(gzipStream, cancellationToken);
        }

        await process.WaitForExitAsync(cancellationToken);
        var standardError = await standardErrorTask;

        if (process.ExitCode != 0)
        {
            TryDelete(filePath);
            throw new InvalidOperationException(string.IsNullOrWhiteSpace(standardError)
                ? $"pg_dump exited with code {process.ExitCode}."
                : standardError.Trim());
        }

        var fileInfo = new FileInfo(filePath);
        return new PlatformDatabaseBackupResult(filePath, fileName, fileInfo.Length, createdAtUtc);
    }

    private static PlatformStorageDto GetStorage()
    {
        try
        {
            var driveRoot = Path.GetPathRoot(ProjectStoragePath) ?? "/";
            var driveInfo = new DriveInfo(driveRoot);

            var total = driveInfo.TotalSize;
            var free = driveInfo.AvailableFreeSpace;
            var used = Math.Max(0, total - free);
            var usagePercent = total > 0 ? Math.Round((double)used * 100d / total, 2) : 0;

            return new PlatformStorageDto(total, used, free, usagePercent);
        }
        catch
        {
            return new PlatformStorageDto(0, 0, 0, 0);
        }
    }

    private static PlatformBackupStatusDto GetBackupStatus()
    {
        try
        {
            var backupDirectory = new DirectoryInfo(BackupDirectoryPath);
            if (!backupDirectory.Exists)
            {
                return new PlatformBackupStatusDto(false, null, 0, null);
            }

            var latest = backupDirectory.EnumerateFiles("*.sql.gz", SearchOption.TopDirectoryOnly)
                .OrderByDescending(file => file.LastWriteTimeUtc)
                .FirstOrDefault();

            if (latest is null)
            {
                return new PlatformBackupStatusDto(false, null, 0, null);
            }

            return new PlatformBackupStatusDto(
                true,
                latest.Name,
                latest.Length,
                new DateTimeOffset(latest.LastWriteTimeUtc, TimeSpan.Zero));
        }
        catch
        {
            return new PlatformBackupStatusDto(false, null, 0, null);
        }
    }

    private static (string Host, int Port, string Database, string UserName, string Password) ParseConnectionString(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("Connection string 'Platform' is missing.");
        }

        var builder = new DbConnectionStringBuilder
        {
            ConnectionString = connectionString
        };

        var host = ReadRequired(builder, "Host");
        var database = ReadRequired(builder, "Database");
        var userName = ReadOptional(builder, "Username")
            ?? ReadOptional(builder, "User ID")
            ?? ReadOptional(builder, "UserID")
            ?? throw new InvalidOperationException("Database username is missing from connection string 'Platform'.");
        var password = ReadRequired(builder, "Password");
        var portRaw = ReadOptional(builder, "Port") ?? "5432";

        if (!int.TryParse(portRaw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var port))
        {
            throw new InvalidOperationException($"Invalid database port '{portRaw}' in connection string 'Platform'.");
        }

        return (host, port, database, userName, password);
    }

    private static string ReadRequired(DbConnectionStringBuilder builder, string key)
    {
        return ReadOptional(builder, key)
            ?? throw new InvalidOperationException($"Connection string 'Platform' is missing '{key}'.");
    }

    private static string? ReadOptional(DbConnectionStringBuilder builder, string key)
    {
        return builder.TryGetValue(key, out var value) && value is not null
            ? Convert.ToString(value, CultureInfo.InvariantCulture)
            : null;
    }

    private static void TryDelete(string filePath)
    {
        try
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
        catch
        {
            // ignore cleanup failure
        }
    }
}
