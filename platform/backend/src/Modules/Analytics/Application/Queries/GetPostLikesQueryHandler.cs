using Platform.Modules.Analytics.Application.Repositories;

namespace Platform.Modules.Analytics.Application.Queries;

public sealed class GetPostLikesQueryHandler(IAnalyticsRepository repository)
{
    public Task<long> HandleAsync(GetPostLikesQuery query, CancellationToken cancellationToken = default)
    {
        return repository.GetPostLikesAsync(query.PostId, cancellationToken);
    }
}
