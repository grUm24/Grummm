using Platform.Modules.PlatformOps.Application.Repositories;

namespace Platform.Modules.PlatformOps.Application.Commands;

public sealed class CreatePlatformBackupCommandHandler(IPlatformOpsRepository repository)
{
    public Task<PlatformDatabaseBackupResult> HandleAsync(
        CreatePlatformBackupCommand command,
        CancellationToken cancellationToken = default)
    {
        return repository.CreateDatabaseBackupAsync(cancellationToken);
    }
}
