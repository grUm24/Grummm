namespace Platform.Modules.PlatformOps.Contracts;

public sealed record PlatformStorageDto(
    long TotalBytes,
    long UsedBytes,
    long FreeBytes,
    double UsagePercent);

public sealed record PlatformBackupStatusDto(
    bool Available,
    string? LatestFileName,
    long LatestFileSizeBytes,
    DateTimeOffset? LatestCreatedAtUtc);

public sealed record PlatformOpsOverviewDto(
    PlatformStorageDto Storage,
    PlatformBackupStatusDto Backup);
