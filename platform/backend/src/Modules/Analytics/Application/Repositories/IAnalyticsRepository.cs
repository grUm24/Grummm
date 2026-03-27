using Platform.Modules.Analytics.Contracts;

namespace Platform.Modules.Analytics.Application.Repositories;

public interface IAnalyticsRepository
{
    Task TrackSiteVisitAsync(string remoteIp, CancellationToken cancellationToken = default);
    Task TrackPostViewAsync(string postId, CancellationToken cancellationToken = default);
    Task<AnalyticsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default);
    Task LikePostAsync(string postId, string remoteIp, CancellationToken cancellationToken = default);
    Task<long> GetPostLikesAsync(string postId, CancellationToken cancellationToken = default);
}
