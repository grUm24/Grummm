using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Platform.Core.Contracts.Modules;
using Platform.Modules.Analytics.Application.Commands;
using Platform.Modules.Analytics.Application.Queries;
using Platform.Modules.Analytics.Application.Repositories;
using Platform.Modules.Analytics.Infrastructure.Repositories;

namespace Platform.Modules.Analytics;

public sealed partial class AnalyticsModule : IModule
{
    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<IAnalyticsRepository>(serviceProvider =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var connectionString = configuration.GetConnectionString("Platform");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("Connection string 'Platform' is required for Analytics module.");
            }

            var logger = serviceProvider.GetRequiredService<ILogger<PostgresAnalyticsRepository>>();
            return new PostgresAnalyticsRepository(connectionString, logger);
        });
        services.AddSingleton<TrackSiteVisitCommandHandler>();
        services.AddSingleton<TrackPostViewCommandHandler>();
        services.AddSingleton<GetAnalyticsOverviewQueryHandler>();
    }

    public partial void MapEndpoints(IEndpointRouteBuilder app);
}

