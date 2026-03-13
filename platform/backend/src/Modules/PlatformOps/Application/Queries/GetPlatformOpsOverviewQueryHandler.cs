using Platform.Modules.PlatformOps.Application.Repositories;
using Platform.Modules.PlatformOps.Contracts;

namespace Platform.Modules.PlatformOps.Application.Queries;

public sealed class GetPlatformOpsOverviewQueryHandler(IPlatformOpsRepository repository)
{
    public Task<PlatformOpsOverviewDto> HandleAsync(GetPlatformOpsOverviewQuery query, CancellationToken cancellationToken = default)
    {
        return repository.GetOverviewAsync(cancellationToken);
    }
}
