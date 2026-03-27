using Npgsql;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using Platform.Modules.Analytics.Application.Repositories;
using Platform.Modules.Analytics.Contracts;

namespace Platform.Modules.Analytics.Infrastructure.Repositories;

public sealed class PostgresAnalyticsRepository(string connectionString, ILogger<PostgresAnalyticsRepository> logger) : IAnalyticsRepository
{
    private const string SiteVisitMetric = "site_visit";

    public async Task TrackSiteVisitAsync(string remoteIp, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        var ipHash = ComputeSha256Hex(string.IsNullOrWhiteSpace(remoteIp) ? "unknown" : remoteIp.Trim());

        const string updateSql = """
            update analytics.site_visit_recent
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
                insert into analytics.site_visit_recent(ip_address_hash, last_seen_utc)
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
            insert into analytics.totals(metric, metric_value)
            values (@metric, 1)
            on conflict(metric)
            do update set metric_value = analytics.totals.metric_value + 1,
                          updated_at_utc = now();
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
            insert into analytics.post_views(post_id, views)
            values (@post_id, 1)
            on conflict(post_id)
            do update set views = analytics.post_views.views + 1,
                          updated_at_utc = now();
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("post_id", postId.Trim());
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task LikePostAsync(string postId, string remoteIp, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(postId))
        {
            return;
        }

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        var ipHash = ComputeSha256Hex(string.IsNullOrWhiteSpace(remoteIp) ? "unknown" : remoteIp.Trim());

        const string dedupSql = """
            insert into analytics.post_like_ips(post_id, ip_hash)
            values (@post_id, @ip_hash)
            on conflict(post_id, ip_hash) do nothing;
            """;

        await using var dedupCommand = new NpgsqlCommand(dedupSql, connection);
        dedupCommand.Parameters.AddWithValue("post_id", postId.Trim());
        dedupCommand.Parameters.AddWithValue("ip_hash", ipHash);
        var inserted = await dedupCommand.ExecuteNonQueryAsync(cancellationToken);

        if (inserted == 0)
        {
            return;
        }

        const string sql = """
            insert into analytics.post_likes(post_id, likes)
            values (@post_id, 1)
            on conflict(post_id)
            do update set likes = analytics.post_likes.likes + 1,
                          updated_at_utc = now();
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("post_id", postId.Trim());
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<long> GetPostLikesAsync(string postId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(postId))
        {
            return 0;
        }

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        const string sql = "select coalesce(likes, 0) from analytics.post_likes where post_id = @post_id limit 1;";
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("post_id", postId.Trim());
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null or DBNull ? 0 : Convert.ToInt64(result);
    }

    public async Task<AnalyticsOverviewDto> GetOverviewAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        var siteVisits = await GetSiteVisitsAsync(connection, cancellationToken);
        var postViews = await GetPostViewsAsync(connection, cancellationToken);

        return new AnalyticsOverviewDto(siteVisits, postViews);
    }

    private static async Task<long> GetSiteVisitsAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = "select coalesce(metric_value, 0) from analytics.totals where metric = @metric limit 1;";
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
            left join analytics.post_views v on v.post_id = p.id
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

    private async Task<NpgsqlConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = new NpgsqlConnection(connectionString);
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
            create schema if not exists analytics;

            create table if not exists analytics.totals (
                metric text primary key,
                metric_value bigint not null default 0,
                updated_at_utc timestamptz not null default now()
            );

            create table if not exists analytics.post_views (
                post_id text primary key,
                views bigint not null default 0,
                updated_at_utc timestamptz not null default now()
            );

            create table if not exists analytics.site_visit_recent (
                ip_address_hash text primary key,
                last_seen_utc timestamptz not null default now()
            );

            create table if not exists analytics.post_likes (
                post_id text primary key,
                likes bigint not null default 0,
                updated_at_utc timestamptz not null default now()
            );

            create table if not exists analytics.post_like_ips (
                post_id text not null,
                ip_hash text not null,
                created_at_utc timestamptz not null default now(),
                primary key (post_id, ip_hash)
            );
            """;

        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
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

    private static string ComputeSha256Hex(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash);
    }
}

