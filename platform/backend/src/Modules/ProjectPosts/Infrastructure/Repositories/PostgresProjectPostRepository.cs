using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Npgsql;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Infrastructure.Repositories;

public sealed class PostgresProjectPostRepository(string connectionString) : IProjectPostRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string _storageRootPath = "/var/projects";

    public async Task<IReadOnlyList<ProjectPostDto>> ListAsync(CancellationToken cancellationToken)
    {
        const string sql = """
                           select id, title_en, title_ru, summary_en, summary_ru, description_en, description_ru,
                                  tags, hero_image_light, hero_image_dark, screenshots, video_url,
                                  template, frontend_path, backend_path
                           from project_posts
                           order by title_en;
                           """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

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
                           select id, title_en, title_ru, summary_en, summary_ru, description_en, description_ru,
                                  tags, hero_image_light, hero_image_dark, screenshots, video_url,
                                  template, frontend_path, backend_path
                           from project_posts
                           where id = @id;
                           """;

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

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
                               id, title_en, title_ru, summary_en, summary_ru, description_en, description_ru,
                               tags, hero_image_light, hero_image_dark, screenshots, video_url,
                               template, frontend_path, backend_path, created_at, updated_at
                           )
                           values (
                               @id, @title_en, @title_ru, @summary_en, @summary_ru, @description_en, @description_ru,
                               @tags, @hero_image_light, @hero_image_dark, @screenshots::jsonb, @video_url,
                               @template, @frontend_path, @backend_path, now(), now()
                           )
                           on conflict (id) do update set
                               title_en = excluded.title_en,
                               title_ru = excluded.title_ru,
                               summary_en = excluded.summary_en,
                               summary_ru = excluded.summary_ru,
                               description_en = excluded.description_en,
                               description_ru = excluded.description_ru,
                               tags = excluded.tags,
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

        var projectRoot = Path.Combine(_storageRootPath, command.Id);
        var frontendFolder = Path.Combine(projectRoot, "frontend");
        var backendFolder = Path.Combine(projectRoot, "backend");

        if (Directory.Exists(projectRoot))
        {
            Directory.Delete(projectRoot, recursive: true);
        }

        await SaveFilesAsync(frontendFolder, command.FrontendFiles, cancellationToken);
        await SaveFilesAsync(backendFolder, command.BackendFiles, cancellationToken);

        var updated = existing with
        {
            Template = command.TemplateType,
            FrontendPath = $"/var/projects/{command.Id}/frontend",
            BackendPath = $"/var/projects/{command.Id}/backend"
        };

        await UpsertAsync(updated, cancellationToken);
        return updated;
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        const string sql = "delete from project_posts where id = @id;";

        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);
        command.Parameters.AddWithValue("id", id);
        var affected = await command.ExecuteNonQueryAsync(cancellationToken);
        return affected > 0;
    }

    private static void BindUpsertParameters(NpgsqlCommand command, ProjectPostDto post)
    {
        command.Parameters.AddWithValue("id", post.Id);
        command.Parameters.AddWithValue("title_en", post.Title.En);
        command.Parameters.AddWithValue("title_ru", post.Title.Ru);
        command.Parameters.AddWithValue("summary_en", post.Summary.En);
        command.Parameters.AddWithValue("summary_ru", post.Summary.Ru);
        command.Parameters.AddWithValue("description_en", post.Description.En);
        command.Parameters.AddWithValue("description_ru", post.Description.Ru);
        command.Parameters.AddWithValue("tags", post.Tags ?? Array.Empty<string>());
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
        var screenshotsJson = reader.GetString(reader.GetOrdinal("screenshots"));
        var screenshots = JsonSerializer.Deserialize<ThemedAssetDto[]>(screenshotsJson, JsonOptions) ?? [];

        return new ProjectPostDto(
            Id: reader.GetString(reader.GetOrdinal("id")),
            Title: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("title_en")),
                Ru: reader.GetString(reader.GetOrdinal("title_ru"))),
            Summary: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("summary_en")),
                Ru: reader.GetString(reader.GetOrdinal("summary_ru"))),
            Description: new LocalizedTextDto(
                En: reader.GetString(reader.GetOrdinal("description_en")),
                Ru: reader.GetString(reader.GetOrdinal("description_ru"))),
            Tags: (string[])reader["tags"],
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

    private static async Task SaveFilesAsync(string baseFolder, IEnumerable<IFormFile> files, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(baseFolder);

        foreach (var file in files)
        {
            var relativePath = SanitizeRelativePath(file.FileName);
            var fullPath = Path.Combine(baseFolder, relativePath);
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            await using var stream = File.Create(fullPath);
            await file.CopyToAsync(stream, cancellationToken);
        }
    }

    private static string SanitizeRelativePath(string rawFileName)
    {
        var normalized = rawFileName.Replace('\\', '/');
        var parts = normalized
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(part => part != ".");

        if (parts.Any(part => part == ".."))
        {
            throw new ValidationException("Invalid relative file path.");
        }

        var segments = parts.ToArray();
        if (segments.Length == 0)
        {
            throw new ValidationException("File path is empty.");
        }

        var safePath = Path.Combine(segments);
        return safePath;
    }
}
