namespace Platform.Modules.Analytics.Contracts;

public sealed record AnalyticsPostViewDto(
    string PostId,
    string Title,
    long Views,
    string Popularity);

public sealed record AnalyticsOverviewDto(
    long SiteVisitsTotal,
    IReadOnlyList<AnalyticsPostViewDto> PostViews);

public sealed record PostLikesDto(string PostId, long Likes);
