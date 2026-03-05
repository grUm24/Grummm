using System.ComponentModel.DataAnnotations;
using System.IO.Compression;
using Microsoft.AspNetCore.Http;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Infrastructure.Repositories;

internal static class ProjectTemplateStorage
{
    private const string StorageRootPath = "/var/projects";

    public static string GetProjectRoot(string id) => Path.Combine(StorageRootPath, id);
    public static string GetFrontendFolder(string id) => Path.Combine(GetProjectRoot(id), "frontend");
    public static string GetBackendFolder(string id) => Path.Combine(GetProjectRoot(id), "backend");
    public static string GetFrontendPath(string id) => $"/var/projects/{id}/frontend";
    public static string? GetBackendPath(string id, TemplateType templateType) =>
        templateType == TemplateType.Static ? null : $"/var/projects/{id}/backend";

    public static void ResetProjectFolder(string id)
    {
        var projectRoot = GetProjectRoot(id);
        if (Directory.Exists(projectRoot))
        {
            Directory.Delete(projectRoot, recursive: true);
        }
    }

    public static async Task SaveTemplateFilesAsync(
        string id,
        IEnumerable<IFormFile> frontendFiles,
        IEnumerable<IFormFile> backendFiles,
        TemplateType templateType,
        CancellationToken cancellationToken)
    {
        await SaveFilesAsync(GetFrontendFolder(id), frontendFiles, cancellationToken);
        NormalizeFrontendRoot(GetFrontendFolder(id));

        if (templateType == TemplateType.Static)
        {
            var indexPath = Path.Combine(GetFrontendFolder(id), "index.html");
            if (!File.Exists(indexPath))
            {
                throw new ValidationException("Static template requires frontend index.html at root of uploaded bundle.");
            }

            RewriteAbsoluteAssetReferences(GetFrontendFolder(id), id);
        }

        if (templateType != TemplateType.Static)
        {
            await SaveFilesAsync(GetBackendFolder(id), backendFiles, cancellationToken);
        }
    }

    private static async Task SaveFilesAsync(string baseFolder, IEnumerable<IFormFile> files, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(baseFolder);

        foreach (var file in files)
        {
            var relativePath = SanitizeRelativePath(file.FileName);

            if (Path.GetExtension(relativePath).Equals(".zip", StringComparison.OrdinalIgnoreCase))
            {
                await ExtractZipArchiveAsync(baseFolder, file, cancellationToken);
                continue;
            }

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

    private static async Task ExtractZipArchiveAsync(string baseFolder, IFormFile file, CancellationToken cancellationToken)
    {
        await using var uploadStream = file.OpenReadStream();
        await using var buffer = new MemoryStream();
        await uploadStream.CopyToAsync(buffer, cancellationToken);
        buffer.Position = 0;

        using var archive = new ZipArchive(buffer, ZipArchiveMode.Read, leaveOpen: false);
        foreach (var entry in archive.Entries)
        {
            if (string.IsNullOrEmpty(entry.Name))
            {
                continue;
            }

            var relativePath = SanitizeRelativePath(entry.FullName);
            var fullPath = Path.Combine(baseFolder, relativePath);
            var directory = Path.GetDirectoryName(fullPath);
            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            await using var destination = File.Create(fullPath);
            await using var entryStream = entry.Open();
            await entryStream.CopyToAsync(destination, cancellationToken);
        }
    }

    private static void NormalizeFrontendRoot(string frontendFolder)
    {
        if (!Directory.Exists(frontendFolder))
        {
            return;
        }

        while (!File.Exists(Path.Combine(frontendFolder, "index.html")))
        {
            var files = Directory.GetFiles(frontendFolder);
            var directories = Directory.GetDirectories(frontendFolder);
            if (files.Length > 0 || directories.Length != 1)
            {
                break;
            }

            var nestedRoot = directories[0];
            foreach (var nestedDirectory in Directory.GetDirectories(nestedRoot))
            {
                var target = Path.Combine(frontendFolder, Path.GetFileName(nestedDirectory));
                Directory.Move(nestedDirectory, target);
            }

            foreach (var nestedFile in Directory.GetFiles(nestedRoot))
            {
                var target = Path.Combine(frontendFolder, Path.GetFileName(nestedFile));
                File.Move(nestedFile, target, overwrite: true);
            }

            Directory.Delete(nestedRoot, recursive: true);
        }
    }

    private static void RewriteAbsoluteAssetReferences(string frontendFolder, string projectId)
    {
        var files = Directory
            .EnumerateFiles(frontendFolder, "*", SearchOption.AllDirectories)
            .Where(path =>
            {
                var extension = Path.GetExtension(path);
                return extension.Equals(".html", StringComparison.OrdinalIgnoreCase)
                    || extension.Equals(".js", StringComparison.OrdinalIgnoreCase)
                    || extension.Equals(".mjs", StringComparison.OrdinalIgnoreCase)
                    || extension.Equals(".css", StringComparison.OrdinalIgnoreCase);
            });

        var from = "/assets/";
        var to = $"/app/{projectId}/assets/";

        foreach (var path in files)
        {
            var content = File.ReadAllText(path);
            if (!content.Contains(from, StringComparison.Ordinal))
            {
                continue;
            }

            var rewritten = content.Replace(from, to, StringComparison.Ordinal);
            if (!string.Equals(content, rewritten, StringComparison.Ordinal))
            {
                File.WriteAllText(path, rewritten);
            }
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

        return Path.Combine(segments);
    }
}
