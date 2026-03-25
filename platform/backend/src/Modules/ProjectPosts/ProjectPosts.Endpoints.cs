using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.StaticFiles;
using System.ComponentModel.DataAnnotations;
using System.IO;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Plugins;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Application.Security;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;
using Platform.Modules.ProjectPosts.Infrastructure.Repositories;

namespace Platform.Modules.ProjectPosts;

public sealed partial class ProjectPostsModule
{
    private static readonly XNamespace SitemapNamespace = "http://www.sitemaps.org/schemas/sitemap/0.9";
    private const string PublicContentVideoBasePath = "/api/public/content/media/videos/";
    private static readonly FileExtensionContentTypeProvider ViewerContentTypeProvider = new();
    private static readonly Regex ViewerQuotedStaticPathRegex = new(
        "(?<prefix>[\"'])/(?<path>(?!(?:/|api/|app/|posts/|projects/|#|\\?))[^\"'\\s?#]+\\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|json|webmanifest|txt|map)(?:\\?[^\"']*)?(?:#[^\"']*)?)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);
    private static readonly Regex ViewerCssUrlStaticPathRegex = new(
        "(?<prefix>url\\(\\s*[\"']?)/(?<path>(?!(?:/|api/|app/|posts/|projects/|#|\\?))[^)\"'\\s?#]+\\.(?:css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|otf|eot|json|webmanifest|txt|map)(?:\\?[^)\"']*)?(?:#[^)\"']*)?)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public partial void MapEndpoints(IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/public/projects");
        var privateGroup = app.MapGroup("/api/app/projects").RequireAuthorization("AdminOnly");
        var publicContentGroup = app.MapGroup("/api/public/content");
        var privateContentGroup = app.MapGroup("/api/app/content").RequireAuthorization("AdminOnly");

        app.MapGet("/sitemap.xml", async (HttpContext context, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var items = (await repository.ListAsync(cancellationToken)).Where(IsPubliclyVisible).ToArray();
            var xml = BuildSitemapXml(context, items);
            return Results.Text(xml, "application/xml; charset=utf-8");
        });

        app.MapGet("/api/public/routes/resolve", async (string path, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var normalizedPath = NormalizePublicRoutePath(path);
            if (IsStaticPublicAppRoute(normalizedPath))
            {
                return Results.NoContent();
            }

            if (!TryResolvePublicEntryPath(normalizedPath, out var expectedKind, out var id) || !ProjectTemplateStorage.IsValidProjectId(id))
            {
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            var item = await repository.GetByIdAsync(id, cancellationToken);
            if (item is null || !IsPubliclyVisible(item))
            {
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            var actualKind = item.Kind == ProjectEntryKind.Post ? "post" : "project";
            return string.Equals(actualKind, expectedKind, StringComparison.Ordinal)
                ? Results.NoContent()
                : Results.StatusCode(StatusCodes.Status403Forbidden);
        });

        publicGroup.MapGet("/", async (IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var items = await repository.ListAsync(cancellationToken);
            return Results.Ok(new { items = items.Where(IsPubliclyVisible).Select(ToPublicProjectPostDto).ToArray() });
        });

        publicGroup.MapGet("/{id}", async (string id, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            if (!ProjectTemplateStorage.IsValidProjectId(id))
            {
                return Results.NotFound();
            }

            var item = await repository.GetByIdAsync(id, cancellationToken);
            return item is null || !IsPubliclyVisible(item)
                ? Results.NotFound()
                : Results.Ok(ToPublicProjectPostDto(item));
        });

        publicGroup.MapGet("/{id}/viewer/{**assetPath}", async (
            string id,
            string? assetPath,
            HttpContext httpContext,
            IProjectPostRepository repository,
            CancellationToken cancellationToken) =>
        {
            if (!ProjectTemplateStorage.IsValidProjectId(id))
            {
                return Results.NotFound();
            }

            var item = await repository.GetByIdAsync(id, cancellationToken);
            var frontendRoot = ProjectTemplateStorage.GetFrontendFolder(id);
            if (!CanServePublicDemo(item, frontendRoot))
            {
                return Results.NotFound();
            }

            if (!TryResolveProjectViewerFile(frontendRoot, assetPath, out var fullPath) || fullPath is null)
            {
                return Results.NotFound();
            }

            httpContext.Response.Headers.CacheControl = "public, max-age=300";
            httpContext.Response.Headers.Append("X-Robots-Tag", "noindex, nofollow");
            httpContext.Response.Headers.Append("Referrer-Policy", "same-origin");

            if (TryBuildRewrittenViewerResponse(id, assetPath, fullPath, httpContext, out var rewrittenResponse))
            {
                return rewrittenResponse;
            }

            return BuildViewerInternalRedirectResult(id, frontendRoot, fullPath, httpContext);
        });

        privateGroup.MapGet("/", async (IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var items = await repository.ListAsync(cancellationToken);
            return Results.Ok(new { items });
        });

        privateGroup.MapGet("/{id}", async (string id, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var item = await repository.GetByIdAsync(id, cancellationToken);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        publicContentGroup.MapGet("/landing", async (IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var content = await repository.GetLandingContentAsync(cancellationToken);
            return Results.Ok(content);
        });

        publicContentGroup.MapGet("/media/videos/{fileName}", (string fileName, HttpContext httpContext) =>
        {
            if (!ProjectTemplateStorage.IsValidContentVideoFileName(fileName))
            {
                return Results.NotFound();
            }

            var fullPath = ProjectTemplateStorage.GetContentVideoPath(fileName);
            if (!File.Exists(fullPath))
            {
                return Results.NotFound();
            }

            httpContext.Response.Headers.CacheControl = "public, max-age=604800, immutable";
            httpContext.Response.Headers.Append("X-Robots-Tag", "noindex, nofollow");
            return Results.File(fullPath, GetViewerContentType(fullPath), enableRangeProcessing: true);
        });

        privateContentGroup.MapPut("/landing", async (UpsertLandingContentRequest request, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            ValidateDto(request);
            var normalized = Normalize(request);
            var updated = await repository.UpsertLandingContentAsync(normalized, cancellationToken);
            return Results.Ok(updated);
        });

        privateContentGroup.MapPost("/media/video", async (
            HttpRequest httpRequest,
            IProjectFileMalwareScanner malwareScanner,
            CancellationToken cancellationToken) =>
        {
            if (!httpRequest.HasFormContentType)
            {
                throw new ValidationException("Content-Type must be multipart/form-data.");
            }

            var form = await httpRequest.ReadFormAsync(cancellationToken);
            var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();
            if (file is null || file.Length <= 0)
            {
                throw new ValidationException("Video file is required.");
            }

            var extension = Path.GetExtension(file.FileName);
            var isVideoContentType = file.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase);
            if (!isVideoContentType && !ProjectTemplateStorage.IsAllowedContentVideoExtension(extension))
            {
                throw new ValidationException("Use a supported video file such as MP4, WebM, MOV, or M4V.");
            }

            var scanResult = await malwareScanner.ScanAsync([file], cancellationToken);
            if (!scanResult.IsClean)
            {
                throw new ValidationException($"Uploaded video '{scanResult.FileName ?? file.FileName}' failed malware scan.");
            }

            var storedFileName = await ProjectTemplateStorage.SaveContentVideoAsync(file, cancellationToken);
            return Results.Ok(new
            {
                url = $"/api/public/content/media/videos/{storedFileName}"
            });
        });

        privateGroup.MapPost("/", async (
            UpsertProjectPostRequest request,
            IProjectPostRepository repository,
            IProjectTemplateRuntimeFeature runtimeFeature,
            CancellationToken cancellationToken) =>
        {
            ValidateDto(request);
            ValidateRuntimeTemplateAvailability(request.Template, request.Kind, runtimeFeature);
            var normalized = Normalize(request);
            var existing = await repository.GetByIdAsync(normalized.Id, cancellationToken);
            var created = await repository.UpsertAsync(normalized, cancellationToken);
            await CleanupUnusedManagedContentVideosAsync(repository, GetManagedContentVideoFileNames(existing), cancellationToken);
            return Results.Created($"/api/app/projects/{created.Id}", created);
        });

        privateGroup.MapPut("/{id}", async (
            string id,
            UpsertProjectPostRequest request,
            IProjectPostRepository repository,
            IProjectTemplateRuntimeFeature runtimeFeature,
            CancellationToken cancellationToken) =>
        {
            ValidateProjectId(id);
            ValidateDto(request);
            ValidateRuntimeTemplateAvailability(request.Template, request.Kind, runtimeFeature);
            var existing = await repository.GetByIdAsync(id.Trim(), cancellationToken);
            var normalized = Normalize(request) with { Id = id.Trim() };
            var updated = await repository.UpsertAsync(normalized, cancellationToken);
            await CleanupUnusedManagedContentVideosAsync(repository, GetManagedContentVideoFileNames(existing), cancellationToken);
            return Results.Ok(updated);
        });

        privateGroup.MapPost("/{id}/upload-with-template",
            async (
                string id,
                HttpRequest httpRequest,
                UploadWithTemplateCommandHandler commandHandler,
                IProjectTemplateRuntimeFeature runtimeFeature,
                CancellationToken cancellationToken) =>
            {
                if (!httpRequest.HasFormContentType)
                {
                    throw new ValidationException("Content-Type must be multipart/form-data.");
                }

                ValidateProjectId(id);
                var form = await httpRequest.ReadFormAsync(cancellationToken);

                var request = new UploadWithTemplateRequest(
                    TemplateType: form["templateType"].ToString(),
                    FrontendFiles: form.Files
                        .Where(f => string.Equals(f.Name, "frontendFiles", StringComparison.Ordinal))
                        .ToArray(),
                    BackendFiles: form.Files
                        .Where(f => string.Equals(f.Name, "backendFiles", StringComparison.Ordinal))
                        .ToArray());

                ValidateDto(request);
                ValidateRuntimeTemplateAvailability(request.TemplateType, runtimeFeature);
                var command = UploadWithTemplateMappings.ToCommand(
                    id: id,
                    request: request,
                    correlationId: httpRequest.HttpContext.TraceIdentifier,
                    performedByUserId: httpRequest.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown",
                    performedByUserName: httpRequest.HttpContext.User.FindFirstValue(ClaimTypes.Name));
                var updated = await commandHandler.HandleAsync(command, cancellationToken);

                return updated is null ? Results.NotFound() : Results.Ok(updated);
            });

        privateGroup.MapDelete("/{id}", async (
            string id,
            IProjectPostRepository repository,
            ICSharpTemplatePluginRuntime pluginRuntime,
            IPythonTemplateRuntime pythonRuntime,
            CancellationToken cancellationToken) =>
        {
            ValidateProjectId(id);
            var existing = await repository.GetByIdAsync(id.Trim(), cancellationToken);
            await pluginRuntime.UnloadForSlugAsync(id, cancellationToken);
            await pythonRuntime.UnloadForSlugAsync(id, cancellationToken);
            var deleted = await repository.DeleteAsync(id, cancellationToken);

            if (deleted)
            {
                ProjectTemplateStorage.ResetProjectFolder(id);
                await CleanupUnusedManagedContentVideosAsync(repository, GetManagedContentVideoFileNames(existing), cancellationToken);
            }

            return deleted ? Results.NoContent() : Results.NotFound();
        });

        MapRuntimeEndpoints(app);
    }

    private static ProjectPostDto ToPublicProjectPostDto(ProjectPostDto item) => item with
    {
        PublicDemoEnabled = IsPublicDemoEnabled(item),
        FrontendPath = null,
        BackendPath = null
    };

    private static bool IsPubliclyVisible(ProjectPostDto item)
    {
        return item.Kind == ProjectEntryKind.Post || item.Visibility != ProjectVisibility.Private;
    }

    private static string NormalizePublicRoutePath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "/";
        }

        var normalized = path.Trim();
        var hashIndex = normalized.IndexOf('#');
        if (hashIndex >= 0)
        {
            normalized = normalized[..hashIndex];
        }

        var queryIndex = normalized.IndexOf('?');
        if (queryIndex >= 0)
        {
            normalized = normalized[..queryIndex];
        }

        if (!normalized.StartsWith("/", StringComparison.Ordinal))
        {
            normalized = $"/{normalized}";
        }

        return normalized.Length > 1 ? normalized.TrimEnd('/') : normalized;
    }

    private static bool IsStaticPublicAppRoute(string path)
    {
        return path.Equals("/", StringComparison.Ordinal)
            || path.Equals("/login", StringComparison.Ordinal)
            || path.Equals("/posts", StringComparison.Ordinal)
            || path.Equals("/projects", StringComparison.Ordinal)
            || path.Equals("/404", StringComparison.Ordinal);
    }

    private static bool TryResolvePublicEntryPath(string path, out string kind, out string id)
    {
        kind = string.Empty;
        id = string.Empty;

        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (segments.Length != 2)
        {
            return false;
        }

        if (segments[0].Equals("posts", StringComparison.Ordinal))
        {
            kind = "post";
            id = segments[1];
            return true;
        }

        if (segments[0].Equals("projects", StringComparison.Ordinal))
        {
            kind = "project";
            id = segments[1];
            return true;
        }

        return false;
    }

    private static bool CanServePublicDemo(ProjectPostDto? item, string frontendRoot)
    {
        return item is not null
            && item.Kind == ProjectEntryKind.Project
            && item.Template == TemplateType.Static
            && IsPublicDemoEnabled(item)
            && Directory.Exists(frontendRoot);
    }

    private static bool IsPublicDemoEnabled(ProjectPostDto item)
    {
        return item.Kind == ProjectEntryKind.Project
            && item.Template == TemplateType.Static
            && (item.Visibility == ProjectVisibility.Demo || item.PublicDemoEnabled);
    }

    partial void MapRuntimeEndpoints(IEndpointRouteBuilder app);

    private static void ValidateRuntimeTemplateAvailability(
        string templateType,
        IProjectTemplateRuntimeFeature runtimeFeature)
    {
        if (!Enum.TryParse<TemplateType>(templateType, ignoreCase: true, out var parsedTemplate))
        {
            return;
        }

        ValidateRuntimeTemplateAvailability(parsedTemplate, runtimeFeature);
    }

    private static void ValidateRuntimeTemplateAvailability(
        TemplateType template,
        IProjectTemplateRuntimeFeature runtimeFeature)
    {
        if (!runtimeFeature.IsEnabled && template is not TemplateType.None and not TemplateType.Static)
        {
            throw new ValidationException("Runtime templates are disabled on this deployment. Use Static or No template.");
        }
    }

    private static void ValidateRuntimeTemplateAvailability(
        TemplateType template,
        ProjectEntryKind kind,
        IProjectTemplateRuntimeFeature runtimeFeature)
    {
        if (kind == ProjectEntryKind.Post)
        {
            return;
        }

        ValidateRuntimeTemplateAvailability(template, runtimeFeature);
    }

    private static string BuildSitemapXml(HttpContext context, IReadOnlyList<ProjectPostDto> items)
    {
        var baseUrl = $"{context.Request.Scheme}://{context.Request.Host.Value}".TrimEnd('/');
        var urls = new List<(string Path, DateTimeOffset? LastModified)>
        {
            ("/", null),
            ("/posts", null),
            ("/projects", null)
        };

        urls.AddRange(items.Select(item => (
            Path: item.Kind == ProjectEntryKind.Post ? $"/posts/{item.Id}" : $"/projects/{item.Id}",
            LastModified: item.PublishedAt)));

        var document = new XDocument(
            new XDeclaration("1.0", "utf-8", null),
            new XElement(
                SitemapNamespace + "urlset",
                urls
                    .DistinctBy(entry => entry.Path, StringComparer.OrdinalIgnoreCase)
                    .Select(entry =>
                    {
                        var urlElement = new XElement(
                            SitemapNamespace + "url",
                            new XElement(SitemapNamespace + "loc", $"{baseUrl}{entry.Path}"));

                        if (entry.LastModified is not null)
                        {
                            urlElement.Add(new XElement(
                                SitemapNamespace + "lastmod",
                                entry.LastModified.Value.UtcDateTime.ToString("yyyy-MM-ddTHH:mm:ssZ")));
                        }

                        return urlElement;
                    })));

        return document.ToString();
    }

    private static bool TryResolveProjectViewerFile(string rootDirectory, string? assetPath, out string? fullPath)
    {
        fullPath = null;
        var rootFullPath = Path.GetFullPath(rootDirectory);
        var normalizedPath = string.IsNullOrWhiteSpace(assetPath)
            ? "index.html"
            : assetPath.Replace('\\', '/').Trim('/');

        var segments = normalizedPath
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(segment => segment != ".")
            .ToArray();

        if (segments.Any(segment => segment == ".."))
        {
            return false;
        }

        var candidatePath = Path.GetFullPath(Path.Combine([rootFullPath, .. segments]));
        if (!candidatePath.StartsWith(rootFullPath, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        if (File.Exists(candidatePath))
        {
            fullPath = candidatePath;
            return true;
        }

        if (Path.HasExtension(candidatePath))
        {
            return false;
        }

        var indexPath = Path.Combine(rootFullPath, "index.html");
        if (!File.Exists(indexPath))
        {
            return false;
        }

        fullPath = indexPath;
        return true;
    }

    private static string GetViewerContentType(string filePath)
    {
        return ViewerContentTypeProvider.TryGetContentType(filePath, out var contentType)
            ? contentType
            : "application/octet-stream";
    }

    private static bool TryBuildRewrittenViewerResponse(
        string projectId,
        string? assetPath,
        string fullPath,
        HttpContext httpContext,
        out IResult? response)
    {
        response = null;

        var extension = Path.GetExtension(fullPath);
        if (!IsRewriteableViewerTextFile(extension))
        {
            return false;
        }

        var content = File.ReadAllText(fullPath);
        var viewerBasePath = ResolveViewerBasePath(httpContext, projectId);
        var rewritten = RewriteViewerContent(content, viewerBasePath, string.IsNullOrWhiteSpace(assetPath));

        if (string.Equals(content, rewritten, StringComparison.Ordinal))
        {
            return false;
        }

        response = Results.Text(rewritten, GetViewerContentType(fullPath));
        return true;
    }

    private static string ResolveViewerBasePath(HttpContext httpContext, string projectId)
    {
        var forwardedPath = httpContext.Request.Headers["X-Viewer-Base-Path"].ToString().Trim();
        if (!string.IsNullOrWhiteSpace(forwardedPath) && forwardedPath.StartsWith("/", StringComparison.Ordinal))
        {
            return forwardedPath.EndsWith("/", StringComparison.Ordinal) ? forwardedPath : $"{forwardedPath}/";
        }

        return $"/api/public/projects/{projectId}/viewer/";
    }

    private static IResult BuildViewerInternalRedirectResult(
        string projectId,
        string rootDirectory,
        string fullPath,
        HttpContext httpContext)
    {
        var relativePath = Path.GetRelativePath(Path.GetFullPath(rootDirectory), fullPath).Replace('\\', '/');
        if (string.IsNullOrWhiteSpace(relativePath) || relativePath.StartsWith("../", StringComparison.Ordinal))
        {
            return Results.NotFound();
        }

        httpContext.Response.Headers["X-Accel-Redirect"] = $"/__project_frontend_public/{projectId}/{relativePath}";
        return Results.Empty;
    }

    private static bool IsRewriteableViewerTextFile(string extension)
    {
        return extension.Equals(".html", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".js", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".mjs", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".css", StringComparison.OrdinalIgnoreCase);
    }

    private static string RewriteViewerContent(string content, string viewerBasePath, bool isHtmlDocument)
    {
        var rewritten = ViewerQuotedStaticPathRegex.Replace(
            content,
            match => $"{match.Groups["prefix"].Value}{viewerBasePath}{match.Groups["path"].Value}");

        rewritten = ViewerCssUrlStaticPathRegex.Replace(
            rewritten,
            match => $"{match.Groups["prefix"].Value}{viewerBasePath}{match.Groups["path"].Value}");

        if (isHtmlDocument && !rewritten.Contains("<base ", StringComparison.OrdinalIgnoreCase))
        {
            var baseTag = $"<base href=\"{viewerBasePath}\">";
            if (rewritten.Contains("<head>", StringComparison.OrdinalIgnoreCase))
            {
                rewritten = rewritten.Replace("<head>", $"<head>{baseTag}", StringComparison.OrdinalIgnoreCase);
            }
        }

        return rewritten;
    }

    private static IReadOnlyCollection<string> GetManagedContentVideoFileNames(ProjectPostDto? item)
    {
        if (item?.ContentBlocks is not { Length: > 0 })
        {
            return Array.Empty<string>();
        }

        return item.ContentBlocks
            .Where(block => block.Type == ProjectPostContentBlockType.Video)
            .Select(block => TryExtractManagedContentVideoFileName(block.VideoUrl))
            .OfType<string>()
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string? TryExtractManagedContentVideoFileName(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        var normalized = url.Trim();
        if (Uri.TryCreate(normalized, UriKind.Absolute, out var absoluteUri))
        {
            normalized = absoluteUri.AbsolutePath;
        }

        var hashIndex = normalized.IndexOf('#');
        if (hashIndex >= 0)
        {
            normalized = normalized[..hashIndex];
        }

        var queryIndex = normalized.IndexOf('?');
        if (queryIndex >= 0)
        {
            normalized = normalized[..queryIndex];
        }

        if (!normalized.StartsWith(PublicContentVideoBasePath, StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var fileName = normalized[PublicContentVideoBasePath.Length..].Trim('/');
        if (fileName.Contains('/'))
        {
            return null;
        }

        return ProjectTemplateStorage.IsValidContentVideoFileName(fileName) ? fileName : null;
    }

    private static async Task CleanupUnusedManagedContentVideosAsync(
        IProjectPostRepository repository,
        IReadOnlyCollection<string> candidateFileNames,
        CancellationToken cancellationToken)
    {
        if (candidateFileNames.Count == 0)
        {
            return;
        }

        var referencedFiles = (await repository.ListAsync(cancellationToken))
            .SelectMany(GetManagedContentVideoFileNames)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        foreach (var fileName in candidateFileNames)
        {
            if (!referencedFiles.Contains(fileName))
            {
                ProjectTemplateStorage.DeleteContentVideoIfExists(fileName);
            }
        }
    }
}
