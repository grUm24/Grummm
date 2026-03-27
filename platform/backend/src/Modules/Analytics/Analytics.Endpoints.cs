using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Platform.Modules.Analytics.Application.Commands;
using Platform.Modules.Analytics.Application.Queries;
using Platform.Modules.Analytics.Contracts;

namespace Platform.Modules.Analytics;

public sealed partial class AnalyticsModule
{
    public partial void MapEndpoints(IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/public/analytics");
        var privateGroup = app.MapGroup("/api/app/analytics").RequireAuthorization("AdminOnly");

        publicGroup.MapPost("/track-site-visit", async (
            HttpContext context,
            TrackSiteVisitCommandHandler commandHandler,
            CancellationToken cancellationToken) =>
        {
            var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await commandHandler.HandleAsync(new TrackSiteVisitCommand(remoteIp), cancellationToken);
            return Results.Accepted();
        });

        publicGroup.MapPost("/track-post-view/{postId}", async (
            string postId,
            TrackPostViewCommandHandler commandHandler,
            CancellationToken cancellationToken) =>
        {
            await commandHandler.HandleAsync(new TrackPostViewCommand(postId), cancellationToken);
            return Results.Accepted();
        });

        publicGroup.MapPost("/like/{postId}", async (
            string postId,
            HttpContext context,
            LikePostCommandHandler commandHandler,
            CancellationToken cancellationToken) =>
        {
            var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            await commandHandler.HandleAsync(new LikePostCommand(postId, remoteIp), cancellationToken);
            return Results.Accepted();
        });

        publicGroup.MapGet("/likes/{postId}", async (
            string postId,
            GetPostLikesQueryHandler queryHandler,
            CancellationToken cancellationToken) =>
        {
            var likes = await queryHandler.HandleAsync(new GetPostLikesQuery(postId), cancellationToken);
            return Results.Ok(new PostLikesDto(postId, likes));
        });

        privateGroup.MapGet("/overview", async (
            GetAnalyticsOverviewQueryHandler queryHandler,
            CancellationToken cancellationToken) =>
        {
            var overview = await queryHandler.HandleAsync(new GetAnalyticsOverviewQuery(), cancellationToken);
            return Results.Ok(overview);
        });
    }
}
