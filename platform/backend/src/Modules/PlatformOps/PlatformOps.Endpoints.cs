using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Platform.Modules.PlatformOps.Application.Queries;

namespace Platform.Modules.PlatformOps;

public sealed partial class PlatformOpsModule
{
    public partial void MapEndpoints(IEndpointRouteBuilder app)
    {
        var privateGroup = app.MapGroup("/api/app/platform-ops").RequireAuthorization("AdminOnly");

        privateGroup.MapGet("/overview", async (
            GetPlatformOpsOverviewQueryHandler queryHandler,
            CancellationToken cancellationToken) =>
        {
            var overview = await queryHandler.HandleAsync(new GetPlatformOpsOverviewQuery(), cancellationToken);
            return Results.Ok(overview);
        });
    }
}
