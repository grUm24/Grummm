using System.Collections.Concurrent;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Infrastructure.Repositories;

public sealed class InMemoryProjectPostRepository : IProjectPostRepository
{
    private readonly ConcurrentDictionary<string, ProjectPost> _storage = new(StringComparer.OrdinalIgnoreCase);
    private readonly string _storageRootPath;

    public InMemoryProjectPostRepository(string? contentRootPath = null)
    {
        _storageRootPath = "/var/projects";

        foreach (var seed in SeedPosts())
        {
            _storage[seed.Id] = ProjectPostMappings.ToDomain(seed);
        }
    }

    public Task<IReadOnlyList<ProjectPostDto>> ListAsync(CancellationToken cancellationToken)
    {
        var list = _storage.Values
            .OrderBy(p => p.Title.En, StringComparer.OrdinalIgnoreCase)
            .Select(ProjectPostMappings.ToDto)
            .ToArray();

        return Task.FromResult<IReadOnlyList<ProjectPostDto>>(list);
    }

    public Task<ProjectPostDto?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        _storage.TryGetValue(id, out var value);
        return Task.FromResult(value is null ? null : ProjectPostMappings.ToDto(value));
    }

    public Task<ProjectPostDto> UpsertAsync(ProjectPostDto post, CancellationToken cancellationToken)
    {
        _storage[post.Id] = ProjectPostMappings.ToDomain(post);
        return Task.FromResult(post);
    }

    public async Task<ProjectPostDto?> UploadWithTemplateAsync(UploadWithTemplateCommand command, CancellationToken cancellationToken)
    {
        if (!_storage.TryGetValue(command.Id, out var existing))
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

        var updated = ProjectPostMappings.ToDto(existing) with
        {
            Template = command.TemplateType,
            FrontendPath = $"/var/projects/{command.Id}/frontend",
            BackendPath = $"/var/projects/{command.Id}/backend"
        };

        _storage[command.Id] = ProjectPostMappings.ToDomain(updated);
        return updated;
    }

    public Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var removed = _storage.TryRemove(id, out _);
        return Task.FromResult(removed);
    }

    private static IEnumerable<ProjectPostDto> SeedPosts()
    {
        yield return new ProjectPostDto(
            Id: "task-tracker",
            Title: new LocalizedTextDto("Task Tracker", "Трекер задач"),
            Summary: new LocalizedTextDto(
                "Owner-scoped task board with secure private routes.",
                "Доска задач с owner-логикой и защищёнными приватными маршрутами."),
            Description: new LocalizedTextDto(
                "Task tracker module with CQRS handlers, ownership checks and private API routes.",
                "Модуль трекера задач с CQRS, проверкой владельца и приватными API-маршрутами."),
            Tags: ["React", ".NET", "CQRS"],
            HeroImage: new ThemedAssetDto(
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 340'><rect width='600' height='340' fill='%231795a8'/></svg>",
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 340'><rect width='600' height='340' fill='%230e2f48'/></svg>"),
            Screenshots:
            [
                new ThemedAssetDto(
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 340'><rect width='600' height='340' fill='%2328a6b8'/></svg>",
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 340'><rect width='600' height='340' fill='%23163145'/></svg>")
            ],
            VideoUrl: null,
            Template: TemplateType.None,
            FrontendPath: null,
            BackendPath: null);
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
