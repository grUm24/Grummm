using Platform.Modules.PlatformOps.Application.Repositories;
using Platform.Modules.PlatformOps.Contracts;

namespace Platform.Modules.PlatformOps.Infrastructure.Repositories;

public sealed class FileSystemPlatformOpsRepository : IPlatformOpsRepository
{
    public Task<PlatformOpsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        var overview = new PlatformOpsOverviewDto(GetStorage());
        return Task.FromResult(overview);
    }

    private static PlatformStorageDto GetStorage()
    {
        try
        {
            const string storagePath = "/var/projects";
            var driveRoot = Path.GetPathRoot(storagePath) ?? "/";
            var driveInfo = new DriveInfo(driveRoot);

            var total = driveInfo.TotalSize;
            var free = driveInfo.AvailableFreeSpace;
            var used = Math.Max(0, total - free);
            var usagePercent = total > 0 ? Math.Round((double)used * 100d / total, 2) : 0;

            return new PlatformStorageDto(total, used, free, usagePercent);
        }
        catch
        {
            return new PlatformStorageDto(0, 0, 0, 0);
        }
    }
}
