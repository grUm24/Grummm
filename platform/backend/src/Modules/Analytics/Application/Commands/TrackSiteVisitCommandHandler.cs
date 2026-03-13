using Platform.Modules.Analytics.Application.Repositories;

namespace Platform.Modules.Analytics.Application.Commands;

public sealed class TrackSiteVisitCommandHandler(IAnalyticsRepository repository)
{
    public Task HandleAsync(TrackSiteVisitCommand command, CancellationToken cancellationToken = default)
    {
        return repository.TrackSiteVisitAsync(command.RemoteIp, cancellationToken);
    }
}
