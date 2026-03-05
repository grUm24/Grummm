namespace Platform.WebAPI.Contracts;

public sealed record AnalyticsStorageDto(
    long TotalBytes,
    long UsedBytes,
    long FreeBytes,
    double UsagePercent);

public sealed record AnalyticsPostViewDto(
    string PostId,
    string Title,
    long Views,
    string Popularity);

public sealed record AnalyticsOverviewDto(
    AnalyticsStorageDto Storage,
    long SiteVisitsTotal,
    IReadOnlyList<AnalyticsPostViewDto> PostViews);
