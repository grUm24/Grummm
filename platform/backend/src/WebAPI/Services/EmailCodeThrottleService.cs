namespace Platform.WebAPI.Services;

public interface IEmailCodeThrottleService
{
    bool TryConsume(string key, out int retryAfterSeconds);
}

public sealed class EmailCodeThrottleService : IEmailCodeThrottleService
{
    private readonly object _sync = new();
    private readonly Dictionary<string, SendState> _stateByKey = new(StringComparer.Ordinal);

    public bool TryConsume(string key, out int retryAfterSeconds)
    {
        var normalized = string.IsNullOrWhiteSpace(key) ? "unknown" : key.Trim();
        var now = DateTimeOffset.UtcNow;

        lock (_sync)
        {
            if (!_stateByKey.TryGetValue(normalized, out var state))
            {
                _stateByKey[normalized] = new SendState(now, 1);
                retryAfterSeconds = 0;
                return true;
            }

            if (now - state.LastSentAtUtc > TimeSpan.FromHours(12))
            {
                state = new SendState(now, 1);
                _stateByKey[normalized] = state;
                retryAfterSeconds = 0;
                return true;
            }

            var delay = RequiredDelay(state.SuccessfulSends);
            var elapsed = now - state.LastSentAtUtc;
            if (elapsed < delay)
            {
                retryAfterSeconds = (int)Math.Ceiling((delay - elapsed).TotalSeconds);
                return false;
            }

            _stateByKey[normalized] = state with
            {
                LastSentAtUtc = now,
                SuccessfulSends = state.SuccessfulSends + 1
            };
            retryAfterSeconds = 0;
            return true;
        }
    }

    private static TimeSpan RequiredDelay(int successfulSends)
    {
        return successfulSends switch
        {
            <= 0 => TimeSpan.Zero,
            1 => TimeSpan.FromMinutes(1),
            2 => TimeSpan.FromMinutes(2),
            3 => TimeSpan.FromMinutes(5),
            _ => TimeSpan.FromMinutes(10)
        };
    }

    private sealed record SendState(DateTimeOffset LastSentAtUtc, int SuccessfulSends);
}
