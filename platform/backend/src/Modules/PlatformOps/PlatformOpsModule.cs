using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Platform.Core.Contracts.Modules;
using Platform.Modules.PlatformOps.Application.Queries;
using Platform.Modules.PlatformOps.Application.Repositories;
using Platform.Modules.PlatformOps.Infrastructure.Repositories;

namespace Platform.Modules.PlatformOps;

public sealed partial class PlatformOpsModule : IModule
{
    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<IPlatformOpsRepository, FileSystemPlatformOpsRepository>();
        services.AddSingleton<GetPlatformOpsOverviewQueryHandler>();
    }

    public partial void MapEndpoints(IEndpointRouteBuilder app);
}
