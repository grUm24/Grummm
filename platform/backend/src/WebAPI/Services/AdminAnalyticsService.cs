using Npgsql;
using System.Security.Cryptography;
using System.Text;
using Platform.WebAPI.Contracts;

namespace Platform.WebAPI.Services;

public interface IAdminAnalyticsService
{
    Task TrackSiteVisitAsync(string remoteIp, CancellationToken cancellationToken = default);
    Task TrackPostViewAsync(string postId, CancellationToken cancellationToken = default);
    Task<AnalyticsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default);
}

public sealed class AdminAnalyticsService(IConfiguration configuration, ILogger<AdminAnalyticsService> logger) : IAdminAnalyticsService
{
    private const string SiteVisitMetric = "site_visit";
    private readonly string? _connectionString = configuration.GetConnectionString("Platform");

    public async Task TrackSiteVisitAsync(string remoteIp, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        var ipHash = ComputeSha256Hex(string.IsNullOrWhiteSpace(remoteIp) ? "unknown" : remoteIp.Trim());

        const string updateSql = """
            update analytics_site_visit_recent
            set last_seen_utc = now()
            where ip_address_hash = @ip_hash
              and last_seen_utc < now() - interval '3 minutes';
            """;

        await using var updateCommand = new NpgsqlCommand(updateSql, connection);
        updateCommand.Parameters.AddWithValue("ip_hash", ipHash);
        var updated = await updateCommand.ExecuteNonQueryAsync(cancellationToken);

        if (updated == 0)
        {
            const string insertSql = """
                insert into analytics_site_visit_recent(ip_address_hash, last_seen_utc)
                values (@ip_hash, now())
                on conflict(ip_address_hash) do nothing;
                """;
            await using var insertCommand = new NpgsqlCommand(insertSql, connection);
            insertCommand.Parameters.AddWithValue("ip_hash", ipHash);
            var inserted = await insertCommand.ExecuteNonQueryAsync(cancellationToken);
            if (inserted == 0)
            {
                return;
            }
        }

        const string sql = """
            insert into analytics_totals(metric, metric_value)
            values (@metric, 1)
            on conflict(metric)
            do update set metric_value = analytics_totals.metric_value + 1;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("metric", SiteVisitMetric);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task TrackPostViewAsync(string postId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(postId))
        {
            return;
        }

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        const string sql = """
            insert into analytics_post_views(post_id, views)
            values (@post_id, 1)
            on conflict(post_id)
            do update set views = analytics_post_views.views + 1;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("post_id", postId.Trim());
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<AnalyticsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        var siteVisits = await GetSiteVisitsAsync(connection, cancellationToken);
        var postViews = await GetPostViewsAsync(connection, cancellationToken);
        var storage = GetStorage();

        return new AnalyticsOverviewDto(storage, siteVisits, postViews);
    }

    private static async Task<long> GetSiteVisitsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = "select coalesce(metric_value, 0) from analytics_totals where metric = @metric limit 1;";
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("metric", SiteVisitMetric);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null or DBNull ? 0 : Convert.ToInt64(result);
    }

    private static async Task<IReadOnlyList<AnalyticsPostViewDto>> GetPostViewsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            select p.id,
                   coalesce(nullif(trim(p.title_ru), ''), nullif(trim(p.title_en), ''), p.id) as title,
                   coalesce(v.views, 0) as views
            from project_posts p
            left join analytics_post_views v on v.post_id = p.id
            where p.template = 0
            order by views desc, p.id asc;
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var rows = new List<(string Id, string Title, long Views)>();

        while (await reader.ReadAsync(cancellationToken))
        {
            rows.Add((
                Id: reader.GetString(0),
                Title: reader.GetString(1),
                Views: reader.GetInt64(2)));
        }

        var maxViews = rows.Count == 0 ? 0 : rows.Max(x => x.Views);
        return rows.Select(row => new AnalyticsPostViewDto(
                PostId: row.Id,
                Title: row.Title,
                Views: row.Views,
                Popularity: MapPopularity(row.Views, maxViews)))
            .ToArray();
    }

    private static string MapPopularity(long views, long maxViews)
    {
        if (views <= 0 || maxViews <= 0)
        {
            return "low";
        }

        var ratio = (double)views / maxViews;
        if (ratio >= 0.66)
        {
            return "high";
        }

        if (ratio >= 0.33)
        {
            return "medium";
        }

        return "low";
    }

    private static AnalyticsStorageDto GetStorage()
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

            return new AnalyticsStorageDto(total, used, free, usagePercent);
        }
        catch
        {
            return new AnalyticsStorageDto(0, 0, 0, 0);
        }
    }

    private async Task<NpgsqlConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_connectionString))
        {
            throw new InvalidOperationException("Connection string 'Platform' is missing for analytics.");
        }

        var connection = new NpgsqlConnection(_connectionString);
        try
        {
            await connection.OpenAsync(cancellationToken);
            return connection;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to open analytics database connection.");
            await connection.DisposeAsync();
            throw;
        }
    }

    private static async Task EnsureSchemaAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            create table if not exists analytics_totals (
                metric text primary key,
                metric_value bigint not null default 0,
                updated_at_utc timestamptz not null default now()
            );

            create table if not exists analytics_post_views (
                post_id text primary key,
                views bigint not null default 0,
                updated_at_utc timestamptz not null default now()
            );

            create table if not exists analytics_site_visit_recent (
                ip_address_hash text primary key,
                last_seen_utc timestamptz not null default now()
            );
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string ComputeSha256Hex(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }
}
