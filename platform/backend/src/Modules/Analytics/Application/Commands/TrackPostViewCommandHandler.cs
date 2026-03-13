using Platform.Modules.Analytics.Application.Repositories;

namespace Platform.Modules.Analytics.Application.Commands;

public sealed class TrackPostViewCommandHandler(IAnalyticsRepository repository)
{
    public Task HandleAsync(TrackPostViewCommand command, CancellationToken cancellationToken = default)
    {
        return repository.TrackPostViewAsync(command.PostId, cancellationToken);
    }
}
