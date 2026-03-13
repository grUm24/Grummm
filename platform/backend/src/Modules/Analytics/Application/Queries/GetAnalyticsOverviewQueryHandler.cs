using Platform.Modules.Analytics.Application.Repositories;
using Platform.Modules.Analytics.Contracts;

namespace Platform.Modules.Analytics.Application.Queries;

public sealed class GetAnalyticsOverviewQueryHandler(IAnalyticsRepository repository)
{
    public Task<AnalyticsOverviewDto> HandleAsync(GetAnalyticsOverviewQuery query, CancellationToken cancellationToken = default)
    {
        return repository.GetOverviewAsync(cancellationToken);
    }
}
