using System.ComponentModel.DataAnnotations;
using System.IO.Compression;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Infrastructure.Repositories;

internal static class ProjectTemplateStorage
{
    private const string StorageRootPath = "/var/projects";
    private const string ContentMediaRootName = "_content-media";
    private const string VideoMediaFolderName = "videos";
    private const long MaxArchiveEntryBytes = 100L * 1024 * 1024;
    private const long MaxArchiveExpandedBytes = 250L * 1024 * 1024;
    private const int MaxArchiveEntryCount = 500;
    private static readonly Regex ProjectIdRegex = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);
    private static readonly Regex ContentVideoFileNameRegex = new("^video-[a-f0-9]{32}\\.(mp4|webm|mov|m4v)$", RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly HashSet<string> AllowedVideoExtensions = new(StringComparer.OrdinalIgnoreCase) { ".mp4", ".webm", ".mov", ".m4v" };
    private static readonly Regex RootQuotedStaticPathRegex = new(
        "(?<prefix>[\"'])/(?<path>(?!(?:/|api/|app/|posts/|projects/|#|\\?))[^\"'\\s?#]+\\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|json|webmanifest|txt|map)(?:\\?[^\"']*)?(?:#[^\"']*)?)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex RootCssUrlStaticPathRegex = new(
        "(?<prefix>url\\(\\s*[\"']?)/(?<path>(?!(?:/|api/|app/|posts/|projects/|#|\\?))[^)\"'\\s?#]+\\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|json|webmanifest|txt|map)(?:\\?[^)\"']*)?(?:#[^)\"']*)?)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public static bool IsValidProjectId(string? id)
    {
        var normalized = id?.Trim();
        return !string.IsNullOrWhiteSpace(normalized) && ProjectIdRegex.IsMatch(normalized);
    }

    public static string GetProjectRoot(string id)
    {
        var normalizedId = NormalizeProjectId(id);
        var rootFullPath = Path.GetFullPath(StorageRootPath);
        var candidate = Path.GetFullPath(Path.Combine(rootFullPath, normalizedId));
        var expectedPrefix = rootFullPath.EndsWith(Path.DirectorySeparatorChar)
            ? rootFullPath
            : $"{rootFullPath}{Path.DirectorySeparatorChar}";

        if (!candidate.StartsWith(expectedPrefix, StringComparison.Ordinal))
        {
            throw new ValidationException("Project id produced an invalid storage path.");
        }

        return candidate;
    }
    public static string GetFrontendFolder(string id) => Path.Combine(GetProjectRoot(id), "frontend");
    public static string GetBackendFolder(string id) => Path.Combine(GetProjectRoot(id), "backend");
    public static string GetFrontendPath(string id) => $"/var/projects/{NormalizeProjectId(id)}/frontend";
    public static string? GetBackendPath(string id, TemplateType templateType) =>
        templateType == TemplateType.Static ? null : $"/var/projects/{NormalizeProjectId(id)}/backend";
    public static string GetContentVideoFolder() => Path.Combine(Path.GetFullPath(StorageRootPath), ContentMediaRootName, VideoMediaFolderName);

    public static bool IsValidContentVideoFileName(string? fileName)
    {
        var normalized = fileName?.Trim();
        return !string.IsNullOrWhiteSpace(normalized) && ContentVideoFileNameRegex.IsMatch(normalized);
    }

    public static bool IsAllowedContentVideoExtension(string? extension)
    {
        return !string.IsNullOrWhiteSpace(extension) && AllowedVideoExtensions.Contains(extension);
    }

    public static string GetContentVideoPath(string fileName)
    {
        if (!IsValidContentVideoFileName(fileName))
        {
            throw new ValidationException("Invalid video file name.");
        }

        return Path.Combine(GetContentVideoFolder(), fileName.Trim());
    }

    public static void DeleteContentVideoIfExists(string fileName)
    {
        if (!IsValidContentVideoFileName(fileName))
        {
            return;
        }

        var fullPath = GetContentVideoPath(fileName);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
    }

    public static async Task<string> SaveContentVideoAsync(IFormFile file, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(file.FileName);
        if (!IsAllowedContentVideoExtension(extension))
        {
            throw new ValidationException("Unsupported video format.");
        }

        var fileName = $"video-{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var targetFolder = GetContentVideoFolder();
        Directory.CreateDirectory(targetFolder);

        var fullPath = Path.Combine(targetFolder, fileName);
        await using var stream = File.Create(fullPath);
        await file.CopyToAsync(stream, cancellationToken);
        return fileName;
    }

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

            RewriteAbsoluteAssetReferences(GetFrontendFolder(id));
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
        var tempArchivePath = Path.Combine(Path.GetTempPath(), $"grummm-upload-{Guid.NewGuid():N}.zip");
        try
        {
            await using (var uploadStream = file.OpenReadStream())
            await using (var tempStream = File.Create(tempArchivePath))
            {
                await uploadStream.CopyToAsync(tempStream, cancellationToken);
            }

            await using var archiveStream = File.OpenRead(tempArchivePath);
            using var archive = new ZipArchive(archiveStream, ZipArchiveMode.Read, leaveOpen: false);
            if (archive.Entries.Count > MaxArchiveEntryCount)
            {
                throw new ValidationException("Archive contains too many files.");
            }

            long totalExpandedBytes = 0;
            foreach (var entry in archive.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name))
                {
                    continue;
                }

                if (entry.Length > MaxArchiveEntryBytes)
                {
                    throw new ValidationException($"Archive entry '{entry.FullName}' exceeds the allowed size.");
                }

                totalExpandedBytes += entry.Length;
                if (totalExpandedBytes > MaxArchiveExpandedBytes)
                {
                    throw new ValidationException("Archive expands beyond the allowed size.");
                }

                if (entry.CompressedLength > 0 && entry.Length > 1_000_000 && entry.Length / Math.Max(entry.CompressedLength, 1) > 200)
                {
                    throw new ValidationException($"Archive entry '{entry.FullName}' has an unsafe compression ratio.");
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
        finally
        {
            if (File.Exists(tempArchivePath))
            {
                File.Delete(tempArchivePath);
            }
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

    private static void RewriteAbsoluteAssetReferences(string frontendFolder)
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
        var to = "assets/";

        foreach (var path in files)
        {
            var content = File.ReadAllText(path);
            var rewritten = content.Replace(from, to, StringComparison.Ordinal);
            rewritten = RootQuotedStaticPathRegex.Replace(
                rewritten,
                match => $"{match.Groups["prefix"].Value}{match.Groups["path"].Value}");
            rewritten = RootCssUrlStaticPathRegex.Replace(
                rewritten,
                match => $"{match.Groups["prefix"].Value}{match.Groups["path"].Value}");

            if (string.Equals(content, rewritten, StringComparison.Ordinal))
            {
                continue;
            }

            File.WriteAllText(path, rewritten);
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

    private static string NormalizeProjectId(string id)
    {
        var normalized = id.Trim();
        if (!ProjectIdRegex.IsMatch(normalized))
        {
            throw new ValidationException("Project id must be a lowercase slug containing only letters, digits, and hyphens.");
        }

        return normalized;
    }
}
