using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.Core.Contracts.Audit;

namespace Platform.Infrastructure.Audit;

public sealed class EfCoreAuditLogWriter(
    IDbContextFactory<AuditLogDbContext> dbContextFactory,
    ILogger<EfCoreAuditLogWriter> logger) : IAuditLogWriter
{
    public async Task WriteAdminActionAsync(AdminActionAuditRecord record, CancellationToken cancellationToken = default)
    {
        await using var db = await dbContextFactory.CreateDbContextAsync(cancellationToken);

        db.AdminActionLogs.Add(new AdminActionAuditEntity
        {
            OccurredAtUtc = record.OccurredAtUtc,
            UserId = record.UserId,
            UserName = record.UserName,
            Role = record.Role,
            Action = record.Action,
            HttpMethod = record.HttpMethod,
            RequestPath = record.RequestPath,
            QueryString = record.QueryString,
            ResponseStatusCode = record.ResponseStatusCode,
            CorrelationId = record.CorrelationId,
            IpAddress = record.IpAddress,
            UserAgent = record.UserAgent
        });

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to persist admin audit log record");
        }
    }
}
