using System.Text.Json;
using Npgsql;
using NpgsqlTypes;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Infrastructure.Repositories;

public sealed class PostgresProjectPostRepository(string connectionString) : IProjectPostRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const string LandingContentId = "main";

    public async Task<IReadOnlyList<ProjectPostDto>> ListAsync(CancellationToken cancellationToken)
    {
        const string sql = """
                           select id, kind, visibility, title_en, title_ru, summary_en, summary_ru, description_en, description_ru,
                                  published_at, content_blocks, tags, public_demo_enabled, hero_image_light, hero_image_dark, screenshots, video_url,
                                  template, frontend_path, backend_path
                           from project_posts
                           order by title_en;
                           """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var result = new List<ProjectPostDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(ReadDto(reader));
        }

        return result;
    }

    public async Task<ProjectPostDto?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        const string sql = """
                           select id, kind, visibility, title_en, title_ru, summary_en, summary_ru, description_en, description_ru,
                                  published_at, content_blocks, tags, public_demo_enabled, hero_image_light, hero_image_dark, screenshots, video_url,
                                  template, frontend_path, backend_path
                           from project_posts
                           where id = @id;
                           """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", id);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return ReadDto(reader);
    }

    public async Task<ProjectPostDto> UpsertAsync(ProjectPostDto post, CancellationToken cancellationToken)
    {
        const string sql = """
                           insert into project_posts (
                               id, kind, visibility, title_en, title_ru, summary_en, summary_ru, description_en, description_ru,
                               published_at, content_blocks, tags, public_demo_enabled, hero_image_light, hero_image_dark, screenshots, video_url,
                               template, frontend_path, backend_path, created_at, updated_at
                           )
                           values (
                               @id, @kind, @visibility, @title_en, @title_ru, @summary_en, @summary_ru, @description_en, @description_ru,
                               coalesce(@published_at, now()),
                               @content_blocks::jsonb, @tags, @public_demo_enabled, @hero_image_light, @hero_image_dark, @screenshots::jsonb, @video_url,
                               @template, @frontend_path, @backend_path, now(), now()
                           )
                           on conflict (id) do update set
                               kind = excluded.kind,
                               visibility = excluded.visibility,
                               title_en = excluded.title_en,
                               title_ru = excluded.title_ru,
                               summary_en = excluded.summary_en,
                               summary_ru = excluded.summary_ru,
                               description_en = excluded.description_en,
                               description_ru = excluded.description_ru,
                               published_at = coalesce(project_posts.published_at, excluded.published_at, now()),
                               content_blocks = excluded.content_blocks,
                               tags = excluded.tags,
                               public_demo_enabled = excluded.public_demo_enabled,
                               hero_image_light = excluded.hero_image_light,
                               hero_image_dark = excluded.hero_image_dark,
                               screenshots = excluded.screenshots,
                               video_url = excluded.video_url,
                               template = excluded.template,
                               frontend_path = excluded.frontend_path,
                               backend_path = excluded.backend_path,
                               updated_at = now();
                           """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        BindUpsertParameters(command, post);
        await command.ExecuteNonQueryAsync(cancellationToken);

        return post;
    }

    public async Task<ProjectPostDto?> UploadWithTemplateAsync(UploadWithTemplateCommand command, CancellationToken cancellationToken)
    {
        var existing = await GetByIdAsync(command.Id, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        ProjectTemplateStorage.ResetProjectFolder(command.Id);
        await ProjectTemplateStorage.SaveTemplateFilesAsync(
            command.Id,
            command.FrontendFiles,
            command.BackendFiles,
            command.TemplateType,
            cancellationToken);

        var updated = existing with
        {
            Template = command.TemplateType,
            FrontendPath = ProjectTemplateStorage.GetFrontendPath(command.Id),
            BackendPath = ProjectTemplateStorage.GetBackendPath(command.Id, command.TemplateType)
        };

        await UpsertAsync(updated, cancellationToken);
        return updated;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        const string sql = "delete from project_posts where id = @id;";

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", id);
        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected > 0;
    }

    public async Task<LandingContentDto> GetLandingContentAsync(CancellationToken cancellationToken)
    {
        const string sql = """
                           select hero_eyebrow_en, hero_eyebrow_ru,
                                  hero_title_en, hero_title_ru,
                                  hero_description_en, hero_description_ru,
                                  about_title_en, about_title_ru,
                                  about_subtitle_en, about_subtitle_ru,
                                  about_text_en, about_text_ru,
                                  portfolio_title_en, portfolio_title_ru,
                                  portfolio_text_en, portfolio_text_ru,
                                  about_photo
                           from landing_content
                           where id = @id;
                           """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", LandingContentId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (await reader.ReadAsync(cancellationToken))
        {
            return ReadLandingContent(reader);
        }

        var seed = SeedLandingContent();
        await UpsertLandingContentAsync(seed, cancellationToken);
        return seed;
    }

    public async Task<LandingContentDto> UpsertLandingContentAsync(LandingContentDto content, CancellationToken cancellationToken)
    {
        const string sql = """
                           insert into landing_content (
                               id,
                               hero_eyebrow_en, hero_eyebrow_ru,
                               hero_title_en, hero_title_ru,
                               hero_description_en, hero_description_ru,
                               about_title_en, about_title_ru,
                               about_subtitle_en, about_subtitle_ru,
                               about_text_en, about_text_ru,
                               portfolio_title_en, portfolio_title_ru,
                               portfolio_text_en, portfolio_text_ru,
                               about_photo,
                               created_at, updated_at
                           )
                           values (
                               @id,
                               @hero_eyebrow_en, @hero_eyebrow_ru,
                               @hero_title_en, @hero_title_ru,
                               @hero_description_en, @hero_description_ru,
                               @about_title_en, @about_title_ru,
                               @about_subtitle_en, @about_subtitle_ru,
                               @about_text_en, @about_text_ru,
                               @portfolio_title_en, @portfolio_title_ru,
                               @portfolio_text_en, @portfolio_text_ru,
                               @about_photo,
                               now(), now()
                           )
                           on conflict (id) do update set
                               hero_eyebrow_en = excluded.hero_eyebrow_en,
                               hero_eyebrow_ru = excluded.hero_eyebrow_ru,
                               hero_title_en = excluded.hero_title_en,
                               hero_title_ru = excluded.hero_title_ru,
                               hero_description_en = excluded.hero_description_en,
                               hero_description_ru = excluded.hero_description_ru,
                               about_title_en = excluded.about_title_en,
                               about_title_ru = excluded.about_title_ru,
                               about_subtitle_en = excluded.about_subtitle_en,
                               about_subtitle_ru = excluded.about_subtitle_ru,
                               about_text_en = excluded.about_text_en,
                               about_text_ru = excluded.about_text_ru,
                               portfolio_title_en = excluded.portfolio_title_en,
                               portfolio_title_ru = excluded.portfolio_title_ru,
                               portfolio_text_en = excluded.portfolio_text_en,
                               portfolio_text_ru = excluded.portfolio_text_ru,
                               about_photo = excluded.about_photo,
                               updated_at = now();
                           """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        BindLandingParameters(command, content);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return content;
    }

    private static void BindUpsertParameters(NpgsqlCommand command, ProjectPostDto post)
    {
        command.Parameters.AddWithValue("id", post.Id);
        command.Parameters.AddWithValue("kind", SerializeKind(post.Kind));
        command.Parameters.AddWithValue("visibility", SerializeVisibility(post.Visibility));
        command.Parameters.AddWithValue("title_en", post.Title.En);
        command.Parameters.AddWithValue("title_ru", post.Title.Ru);
        command.Parameters.AddWithValue("summary_en", post.Summary.En);
        command.Parameters.AddWithValue("summary_ru", post.Summary.Ru);
        command.Parameters.AddWithValue("description_en", post.Description.En);
        command.Parameters.AddWithValue("description_ru", post.Description.Ru);
        command.Parameters.Add(new NpgsqlParameter("published_at", NpgsqlDbType.TimestampTz)
        {
            Value = (object?)post.PublishedAt ?? DBNull.Value
        });
        command.Parameters.AddWithValue("content_blocks", JsonSerializer.Serialize(post.ContentBlocks ?? Array.Empty<ProjectPostContentBlockDto>(), JsonOptions));
        command.Parameters.AddWithValue("tags", post.Tags ?? Array.Empty<string>());
        command.Parameters.AddWithValue("public_demo_enabled", post.PublicDemoEnabled);
        command.Parameters.AddWithValue("hero_image_light", post.HeroImage.Light);
        command.Parameters.AddWithValue("hero_image_dark", post.HeroImage.Dark);
        command.Parameters.AddWithValue("screenshots", JsonSerializer.Serialize(post.Screenshots ?? Array.Empty<ThemedAssetDto>(), JsonOptions));
        command.Parameters.AddWithValue("video_url", (object?)post.VideoUrl ?? DBNull.Value);
        command.Parameters.AddWithValue("template", (short)post.Template);
        command.Parameters.AddWithValue("frontend_path", (object?)post.FrontendPath ?? DBNull.Value);
        command.Parameters.AddWithValue("backend_path", (object?)post.BackendPath ?? DBNull.Value);
    }

    private static ProjectPostDto ReadDto(NpgsqlDataReader reader)
    {
        var contentBlocksJson = reader.GetString(reader.GetOrdinal("content_blocks"));
        var contentBlocks = JsonSerializer.Deserialize<ProjectPostContentBlockDto[]>(contentBlocksJson, JsonOptions) ?? [];
        var screenshotsJson = reader.GetString(reader.GetOrdinal("screenshots"));
        var screenshots = JsonSerializer.Deserialize<ThemedAssetDto[]>(screenshotsJson, JsonOptions) ?? [];

        return new ProjectPostDto(
            Id: reader.GetString(reader.GetOrdinal("id")),
            Kind: ParseKind(reader.GetString(reader.GetOrdinal("kind"))),
            Visibility: ParseVisibility(reader.GetString(reader.GetOrdinal("visibility"))),
            Title: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("title_en")),
                Ru: reader.GetString(reader.GetOrdinal("title_ru"))),
            Summary: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("summary_en")),
                Ru: reader.GetString(reader.GetOrdinal("summary_ru"))),
            Description: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("description_en")),
                Ru: reader.GetString(reader.GetOrdinal("description_ru"))),
            PublishedAt: reader.IsDBNull(reader.GetOrdinal("published_at"))
                ? null
                : reader.GetFieldValue<DateTimeOffset>(reader.GetOrdinal("published_at")),
            ContentBlocks: contentBlocks,
            Tags: (string[])reader["tags"],
            PublicDemoEnabled: reader.GetBoolean(reader.GetOrdinal("public_demo_enabled")),
            HeroImage: new ThemedAssetDto(
                Light: reader.GetString(reader.GetOrdinal("hero_image_light")),
                Dark: reader.GetString(reader.GetOrdinal("hero_image_dark"))),
            Screenshots: screenshots,
            VideoUrl: reader.IsDBNull(reader.GetOrdinal("video_url"))
                ? null
                : reader.GetString(reader.GetOrdinal("video_url")),
            Template: (TemplateType)reader.GetInt16(reader.GetOrdinal("template")),
            FrontendPath: reader.IsDBNull(reader.GetOrdinal("frontend_path"))
                ? null
                : reader.GetString(reader.GetOrdinal("frontend_path")),
            BackendPath: reader.IsDBNull(reader.GetOrdinal("backend_path"))
                ? null
                : reader.GetString(reader.GetOrdinal("backend_path")));
    }

    private static LandingContentDto ReadLandingContent(NpgsqlDataReader reader)
    {
        return new LandingContentDto(
            HeroEyebrow: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("hero_eyebrow_en")),
                Ru: reader.GetString(reader.GetOrdinal("hero_eyebrow_ru"))),
            HeroTitle: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("hero_title_en")),
                Ru: reader.GetString(reader.GetOrdinal("hero_title_ru"))),
            HeroDescription: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("hero_description_en")),
                Ru: reader.GetString(reader.GetOrdinal("hero_description_ru"))),
            AboutTitle: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("about_title_en")),
                Ru: reader.GetString(reader.GetOrdinal("about_title_ru"))),
            AboutSubtitle: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("about_subtitle_en")),
                Ru: reader.GetString(reader.GetOrdinal("about_subtitle_ru"))),
            AboutText: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("about_text_en")),
                Ru: reader.GetString(reader.GetOrdinal("about_text_ru"))),
            PortfolioTitle: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("portfolio_title_en")),
                Ru: reader.GetString(reader.GetOrdinal("portfolio_title_ru"))),
            PortfolioText: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("portfolio_text_en")),
                Ru: reader.GetString(reader.GetOrdinal("portfolio_text_ru"))),
            AboutPhoto: reader.IsDBNull(reader.GetOrdinal("about_photo"))
                ? null
                : reader.GetString(reader.GetOrdinal("about_photo")));
    }

    private static void BindLandingParameters(NpgsqlCommand command, LandingContentDto content)
    {
        command.Parameters.AddWithValue("id", LandingContentId);
        command.Parameters.AddWithValue("hero_eyebrow_en", content.HeroEyebrow.En);
        command.Parameters.AddWithValue("hero_eyebrow_ru", content.HeroEyebrow.Ru);
        command.Parameters.AddWithValue("hero_title_en", content.HeroTitle.En);
        command.Parameters.AddWithValue("hero_title_ru", content.HeroTitle.Ru);
        command.Parameters.AddWithValue("hero_description_en", content.HeroDescription.En);
        command.Parameters.AddWithValue("hero_description_ru", content.HeroDescription.Ru);
        command.Parameters.AddWithValue("about_title_en", content.AboutTitle.En);
        command.Parameters.AddWithValue("about_title_ru", content.AboutTitle.Ru);
        command.Parameters.AddWithValue("about_subtitle_en", content.AboutSubtitle?.En ?? string.Empty);
        command.Parameters.AddWithValue("about_subtitle_ru", content.AboutSubtitle?.Ru ?? string.Empty);
        command.Parameters.AddWithValue("about_text_en", content.AboutText.En);
        command.Parameters.AddWithValue("about_text_ru", content.AboutText.Ru);
        command.Parameters.AddWithValue("portfolio_title_en", content.PortfolioTitle.En);
        command.Parameters.AddWithValue("portfolio_title_ru", content.PortfolioTitle.Ru);
        command.Parameters.AddWithValue("portfolio_text_en", content.PortfolioText.En);
        command.Parameters.AddWithValue("portfolio_text_ru", content.PortfolioText.Ru);
        command.Parameters.AddWithValue("about_photo", (object?)content.AboutPhoto ?? DBNull.Value);
    }

    private static LandingContentDto SeedLandingContent()
    {
        return new LandingContentDto(
            HeroEyebrow: new LocalizedTextDto("GRUMMM PLATFORM", "GRUMMM PLATFORM"),
            HeroTitle: new LocalizedTextDto(
                "A platform where projects become live demonstrations.",
                "Платформа, где проекты превращаются в живые демонстрации"),
            HeroDescription: new LocalizedTextDto(
                "Grummm.ru is a personal showcase with a public portfolio and private admin area where I manage projects, templates, and content.",
                "Grummm.ru — это персональная витрина с публичным портфолио и приватной админ-зоной, где я управляю проектами, шаблонами и контентом"),
            AboutTitle: new LocalizedTextDto("About the platform", "О платформе"),
            AboutSubtitle: new LocalizedTextDto("What I build", "Что я делаю"),
            AboutText: new LocalizedTextDto(
                "I build practical web products end-to-end: from idea and interface to backend logic and deployment. This page shows my approach to architecture, security, and product thinking",
                "Я создаю прикладные web-проекты: от идеи и интерфейса до backend-логики и деплоя. Здесь виден мой подход к архитектуре, безопасности и развитию продукта"),
            PortfolioTitle: new LocalizedTextDto("Portfolio", "Портфолио"),
            PortfolioText: new LocalizedTextDto(
                "The portfolio includes projects with multiple templates: static, JavaScript, C#, and Python. Each one can be opened, explored, and reviewed in action",
                "В портфолио собраны проекты с разными шаблонами: static, JavaScript, C#, Python. Каждый можно открыть, изучить и оценить в работе"),
            AboutPhoto: null);
    }

    private static async Task EnsureSchemaAsync(NpgsqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
                           create table if not exists project_posts (
                               id text primary key,
                               kind text not null default 'post',
                               visibility text not null default 'public',
                               title_en text not null,
                               title_ru text not null,
                               summary_en text not null,
                               summary_ru text not null,
                               description_en text not null,
                               description_ru text not null,
                               published_at timestamptz null,
                               content_blocks jsonb not null default '[]'::jsonb,
                               tags text[] not null default '{}',
                               public_demo_enabled boolean not null default false,
                               hero_image_light text not null,
                               hero_image_dark text not null,
                               screenshots jsonb not null default '[]'::jsonb,
                               video_url text null,
                               template smallint not null default 0,
                               frontend_path text null,
                               backend_path text null,
                               created_at timestamptz not null default now(),
                               updated_at timestamptz not null default now()
                           );

                           alter table project_posts
                               add column if not exists published_at timestamptz null;
                           alter table project_posts
                               add column if not exists kind text;
                           alter table project_posts
                               add column if not exists visibility text;

                           alter table project_posts
                               add column if not exists content_blocks jsonb not null default '[]'::jsonb;
                           alter table project_posts
                               add column if not exists public_demo_enabled boolean not null default false;
                           update project_posts
                           set kind = case
                               when template <> 0 or frontend_path is not null or backend_path is not null then 'project'
                               else 'post'
                           end
                           where kind is null or btrim(kind) = '';

                           update project_posts
                           set visibility = case
                               when kind = 'post' then 'public'
                               when public_demo_enabled then 'demo'
                               else coalesce(nullif(btrim(visibility), ''), 'public')
                           end
                           where visibility is null or btrim(visibility) = '';

                           update project_posts
                           set content_blocks = '[]'::jsonb
                           where content_blocks is null;

                           update project_posts
                           set published_at = coalesce(published_at, created_at, now())
                           where published_at is null;

                           alter table project_posts
                               alter column kind set default 'post';

                           alter table project_posts
                               alter column kind set not null;
                           alter table project_posts
                               alter column visibility set default 'public';
                           alter table project_posts
                               alter column visibility set not null;

                           create table if not exists landing_content (
                               id text primary key,
                               hero_eyebrow_en text not null,
                               hero_eyebrow_ru text not null,
                               hero_title_en text not null,
                               hero_title_ru text not null,
                               hero_description_en text not null,
                               hero_description_ru text not null,
                               about_title_en text not null,
                               about_title_ru text not null,
                               about_subtitle_en text not null default '',
                               about_subtitle_ru text not null default '',
                               about_text_en text not null,
                               about_text_ru text not null,
                               portfolio_title_en text not null,
                               portfolio_title_ru text not null,
                               portfolio_text_en text not null,
                               portfolio_text_ru text not null,
                               about_photo text null,
                               created_at timestamptz not null default now(),
                               updated_at timestamptz not null default now()
                           );

                           alter table landing_content
                               add column if not exists about_subtitle_en text not null default '';
                           alter table landing_content
                               add column if not exists about_subtitle_ru text not null default '';

                           -- Topics
                           create table if not exists topics (
                               id text primary key,
                               name_en text not null,
                               name_ru text not null,
                               created_at timestamptz not null default now()
                           );

                           -- Project ↔ Topic many-to-many
                           create table if not exists project_topics (
                               project_id text not null references project_posts(id) on delete cascade,
                               topic_id text not null references topics(id) on delete cascade,
                               primary key (project_id, topic_id)
                           );

                           -- Project ↔ Project explicit relations (bidirectional)
                           create table if not exists project_relations (
                               source_id text not null references project_posts(id) on delete cascade,
                               target_id text not null references project_posts(id) on delete cascade,
                               primary key (source_id, target_id),
                               check (source_id <> target_id)
                           );
                           """;

        await using var command = new NpgsqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    // ── Topics ──

    public async Task<IReadOnlyList<TopicDto>> ListTopicsAsync(CancellationToken cancellationToken)
    {
        const string sql = "select id, name_en, name_ru from topics order by name_en;";
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<TopicDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(new TopicDto(
                reader.GetString(0),
                new LocalizedTextDto(reader.GetString(1), reader.GetString(2))));
        }
        return result;
    }

    public async Task<TopicDto> UpsertTopicAsync(TopicDto topic, CancellationToken cancellationToken)
    {
        const string sql = """
                           insert into topics (id, name_en, name_ru)
                           values (@id, @name_en, @name_ru)
                           on conflict (id) do update set name_en = excluded.name_en, name_ru = excluded.name_ru;
                           """;
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", topic.Id);
        command.Parameters.AddWithValue("name_en", topic.Name.En);
        command.Parameters.AddWithValue("name_ru", topic.Name.Ru);
        await command.ExecuteNonQueryAsync(cancellationToken);
        return topic;
    }

    public async Task<bool> DeleteTopicAsync(string id, CancellationToken cancellationToken)
    {
        const string sql = "delete from topics where id = @id;";
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
    }

    // ── Project ↔ Topic ──

    public async Task<string[]> GetProjectTopicIdsAsync(string projectId, CancellationToken cancellationToken)
    {
        const string sql = "select topic_id from project_topics where project_id = @project_id order by topic_id;";
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("project_id", projectId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<string>();
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(reader.GetString(0));
        }
        return result.ToArray();
    }

    public async Task SetProjectTopicsAsync(string projectId, string[] topicIds, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var deleteCmd = new NpgsqlCommand("delete from project_topics where project_id = @project_id;", connection, transaction))
        {
            deleteCmd.Parameters.AddWithValue("project_id", projectId);
            await deleteCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        if (topicIds.Length > 0)
        {
            const string insertSql = "insert into project_topics (project_id, topic_id) values (@project_id, @topic_id) on conflict do nothing;";
            foreach (var topicId in topicIds.Distinct())
            {
                await using var insertCmd = new NpgsqlCommand(insertSql, connection, transaction);
                insertCmd.Parameters.AddWithValue("project_id", projectId);
                insertCmd.Parameters.AddWithValue("topic_id", topicId);
                await insertCmd.ExecuteNonQueryAsync(cancellationToken);
            }
        }

        await transaction.CommitAsync(cancellationToken);
    }

    // ── Project ↔ Project relations ──

    public async Task<string[]> GetProjectRelationIdsAsync(string projectId, CancellationToken cancellationToken)
    {
        const string sql = """
                           select target_id from project_relations where source_id = @id
                           union
                           select source_id from project_relations where target_id = @id
                           order by 1;
                           """;
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", projectId);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var result = new List<string>();
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(reader.GetString(0));
        }
        return result.ToArray();
    }

    public async Task SetProjectRelationsAsync(string projectId, string[] targetIds, CancellationToken cancellationToken)
    {
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        await using (var deleteCmd = new NpgsqlCommand(
            "delete from project_relations where source_id = @id or target_id = @id;", connection, transaction))
        {
            deleteCmd.Parameters.AddWithValue("id", projectId);
            await deleteCmd.ExecuteNonQueryAsync(cancellationToken);
        }

        if (targetIds.Length > 0)
        {
            const string insertSql = "insert into project_relations (source_id, target_id) values (@source, @target) on conflict do nothing;";
            foreach (var targetId in targetIds.Distinct().Where(tid => !string.Equals(tid, projectId, StringComparison.Ordinal)))
            {
                await using var insertCmd = new NpgsqlCommand(insertSql, connection, transaction);
                insertCmd.Parameters.AddWithValue("source", projectId);
                insertCmd.Parameters.AddWithValue("target", targetId);
                await insertCmd.ExecuteNonQueryAsync(cancellationToken);
            }
        }

        await transaction.CommitAsync(cancellationToken);
    }

    // ── Recommendations ──

    public async Task<IReadOnlyList<RelatedProjectDto>> GetRelatedAsync(string projectId, int limit, CancellationToken cancellationToken)
    {
        // Priority: 1) explicit relations, 2) shared topics, 3) same kind
        const string sql = """
                           with current_topics as (
                               select topic_id from project_topics where project_id = @id
                           ),
                           current_kind as (
                               select kind from project_posts where id = @id
                           ),
                           explicit_relations as (
                               select target_id as related_id from project_relations where source_id = @id
                               union
                               select source_id from project_relations where target_id = @id
                           ),
                           scored as (
                               select
                                   pp.id,
                                   pp.kind,
                                   pp.title_en,
                                   pp.title_ru,
                                   pp.summary_en,
                                   pp.summary_ru,
                                   pp.hero_image_light,
                                   pp.hero_image_dark,
                                   case when er.related_id is not null then 100 else 0 end
                                       + coalesce(topic_match.shared_count, 0) * 10
                                       + case when pp.kind = (select kind from current_kind) then 1 else 0 end
                                       as score,
                                   coalesce(array_agg(distinct st.topic_id) filter (where st.topic_id is not null), '{}') as shared_topic_ids
                               from project_posts pp
                               left join explicit_relations er on er.related_id = pp.id
                               left join lateral (
                                   select count(*) as shared_count
                                   from project_topics pt
                                   where pt.project_id = pp.id and pt.topic_id in (select topic_id from current_topics)
                               ) topic_match on true
                               left join project_topics st on st.project_id = pp.id and st.topic_id in (select topic_id from current_topics)
                               where pp.id <> @id
                                 and (pp.kind = 'post' or pp.visibility <> 'private')
                               group by pp.id, pp.kind, pp.title_en, pp.title_ru, pp.summary_en, pp.summary_ru,
                                        pp.hero_image_light, pp.hero_image_dark, er.related_id, topic_match.shared_count
                           )
                           select id, kind, title_en, title_ru, summary_en, summary_ru, hero_image_light, hero_image_dark, shared_topic_ids
                           from scored
                           where score > 0
                           order by score desc, id
                           limit @limit;
                           """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        await EnsureSchemaAsync(connection, cancellationToken);
        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", projectId);
        command.Parameters.AddWithValue("limit", limit);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var result = new List<RelatedProjectDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            result.Add(new RelatedProjectDto(
                Id: reader.GetString(0),
                Kind: ParseKind(reader.GetString(1)),
                Title: new LocalizedTextDto(reader.GetString(2), reader.GetString(3)),
                Summary: new LocalizedTextDto(reader.GetString(4), reader.GetString(5)),
                HeroImage: new ThemedAssetDto(reader.GetString(6), reader.GetString(7)),
                SharedTopics: (string[])reader[8]));
        }

        return result;
    }

    private static string SerializeKind(ProjectEntryKind kind)
    {
        return kind == ProjectEntryKind.Project ? "project" : "post";
    }

    private static ProjectEntryKind ParseKind(string? raw)
    {
        return string.Equals(raw, "project", StringComparison.OrdinalIgnoreCase)
            ? ProjectEntryKind.Project
            : ProjectEntryKind.Post;
    }

    private static string SerializeVisibility(ProjectVisibility visibility)
    {
        return visibility switch
        {
            ProjectVisibility.Private => "private",
            ProjectVisibility.Demo => "demo",
            _ => "public"
        };
    }

    private static ProjectVisibility ParseVisibility(string? raw)
    {
        if (string.Equals(raw, "private", StringComparison.OrdinalIgnoreCase))
        {
            return ProjectVisibility.Private;
        }

        if (string.Equals(raw, "demo", StringComparison.OrdinalIgnoreCase))
        {
            return ProjectVisibility.Demo;
        }

        return ProjectVisibility.Public;
    }
}

