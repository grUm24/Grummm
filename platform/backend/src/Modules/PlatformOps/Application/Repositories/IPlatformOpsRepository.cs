using Platform.Modules.PlatformOps.Application.Commands;
using Platform.Modules.PlatformOps.Contracts;

namespace Platform.Modules.PlatformOps.Application.Repositories;

public interface IPlatformOpsRepository
{
    Task<PlatformOpsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default);
    Task<PlatformDatabaseBackupResult> CreateDatabaseBackupAsync(CancellationToken cancellationToken = default);
}
