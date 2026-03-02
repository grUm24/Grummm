using Microsoft.EntityFrameworkCore;

namespace Platform.Infrastructure.Audit;

public sealed class AuditLogDbContext(DbContextOptions<AuditLogDbContext> options) : DbContext(options)
{
    public DbSet<AdminActionAuditEntity> AdminActionLogs => Set<AdminActionAuditEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<AdminActionAuditEntity>();
        entity.ToTable("admin_action_audit_logs", "audit");

        entity.HasKey(x => x.Id);
        entity.Property(x => x.Id).HasColumnName("id").UseIdentityByDefaultColumn();
        entity.Property(x => x.OccurredAtUtc).HasColumnName("occurred_at_utc").IsRequired();
        entity.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        entity.Property(x => x.UserName).HasColumnName("user_name").HasMaxLength(256);
        entity.Property(x => x.Role).HasColumnName("role").HasMaxLength(64).IsRequired();
        entity.Property(x => x.Action).HasColumnName("action").HasMaxLength(256).IsRequired();
        entity.Property(x => x.HttpMethod).HasColumnName("http_method").HasMaxLength(16).IsRequired();
        entity.Property(x => x.RequestPath).HasColumnName("request_path").HasMaxLength(512).IsRequired();
        entity.Property(x => x.QueryString).HasColumnName("query_string").HasMaxLength(1024);
        entity.Property(x => x.ResponseStatusCode).HasColumnName("response_status_code").IsRequired();
        entity.Property(x => x.CorrelationId).HasColumnName("correlation_id").HasMaxLength(128);
        entity.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(128);
        entity.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(1024);

        entity.HasIndex(x => x.OccurredAtUtc);
        entity.HasIndex(x => x.UserId);
    }
}
