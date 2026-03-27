namespace Platform.Modules.PlatformOps.Application.Commands;

public sealed record PlatformDatabaseBackupResult(
    string FilePath,
    string FileName,
    long SizeBytes,
    DateTimeOffset CreatedAtUtc);
