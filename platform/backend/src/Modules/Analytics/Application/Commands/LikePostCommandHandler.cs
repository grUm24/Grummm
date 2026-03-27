using Platform.Modules.Analytics.Application.Repositories;

namespace Platform.Modules.Analytics.Application.Commands;

public sealed class LikePostCommandHandler(IAnalyticsRepository repository)
{
    public Task HandleAsync(LikePostCommand command, CancellationToken cancellationToken = default)
    {
        return repository.LikePostAsync(command.PostId, command.RemoteIp, cancellationToken);
    }
}
