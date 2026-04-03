using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Platform.Core.Contracts.Modules;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Plugins;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Application.Security;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;
using Platform.Modules.ProjectPosts.Infrastructure.Plugins;
using Platform.Modules.ProjectPosts.Infrastructure.Repositories;
using Platform.Modules.ProjectPosts.Infrastructure.Security;

namespace Platform.Modules.ProjectPosts;

public sealed partial class ProjectPostsModule : IModule
{
    private static readonly Regex ProjectIdRegex = new("^[a-z0-9]+(?:-[a-z0-9]+)*$", RegexOptions.Compiled);

    public void RegisterServices(IServiceCollection services)
    {
        services.AddOptions<ClamAvOptions>()
            .BindConfiguration("ClamAv");
        services.AddSingleton<IProjectFileMalwareScanner, ClamAvNetProjectFileMalwareScanner>();
        services.AddSingleton<ICSharpTemplatePluginRuntime, NoopCSharpTemplatePluginRuntime>();
        services.AddSingleton<IPythonTemplateRuntime, NoopPythonTemplateRuntime>();
        services.AddSingleton<IProjectTemplateRuntimeFeature, DisabledProjectTemplateRuntimeFeature>();

        services.AddSingleton<IProjectPostRepository>(serviceProvider =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var connectionString = configuration.GetConnectionString("Platform");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return new InMemoryProjectPostRepository();
            }

            return new PostgresProjectPostRepository(connectionString);
        });
        services.AddSingleton<UploadWithTemplateCommandHandler>();
        RegisterRuntimeServices(services);
    }

    public partial void MapEndpoints(IEndpointRouteBuilder app);
    partial void RegisterRuntimeServices(IServiceCollection services);

    private static ProjectPostDto Normalize(UpsertProjectPostRequest request)
    {
        ValidateProjectId(request.Id);

        var tags = (request.Tags ?? Array.Empty<string>())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var kind = NormalizeKind(request);
        var contentBlocks = kind == ProjectEntryKind.Post
            ? NormalizeContentBlocks(request.ContentBlocks)
            : [];

        var fallbackDescriptionEn = GetDescriptionFallback(request.Description.En, request.Summary.En, contentBlocks, language: "en");
        var fallbackDescriptionRu = GetDescriptionFallback(request.Description.Ru, request.Summary.Ru, contentBlocks, language: "ru");

        var template = kind == ProjectEntryKind.Post
            ? TemplateType.None
            : Enum.IsDefined(request.Template) ? request.Template : TemplateType.None;

        var frontendPath = kind == ProjectEntryKind.Post || string.IsNullOrWhiteSpace(request.FrontendPath)
            ? null
            : request.FrontendPath.Trim();
        var backendPath = kind == ProjectEntryKind.Post || string.IsNullOrWhiteSpace(request.BackendPath)
            ? null
            : request.BackendPath.Trim();
        var visibility = NormalizeVisibility(request, kind, template);
        var publicDemoEnabled = kind == ProjectEntryKind.Project
            && template == TemplateType.Static
            && visibility == ProjectVisibility.Demo;

        var screenshots = (request.Screenshots is { Length: > 0 } ? request.Screenshots : [request.HeroImage])
            .Select(s => new ThemedAssetDto(
                Light: s.Light.Trim(),
                Dark: s.Dark.Trim()))
            .ToArray();

        return new ProjectPostDto(
            Id: request.Id.Trim(),
            Kind: kind,
            Visibility: visibility,
            Title: new LocalizedTextDto(request.Title.En.Trim(), request.Title.Ru.Trim()),
            Summary: new LocalizedTextDto(request.Summary.En.Trim(), request.Summary.Ru.Trim()),
            Description: new LocalizedTextDto(fallbackDescriptionEn, fallbackDescriptionRu),
            PublishedAt: request.PublishedAt ?? DateTimeOffset.UtcNow,
            ContentBlocks: contentBlocks,
            Tags: tags,
            PublicDemoEnabled: publicDemoEnabled,
            HeroImage: new ThemedAssetDto(request.HeroImage.Light.Trim(), request.HeroImage.Dark.Trim()),
            Screenshots: screenshots,
            VideoUrl: string.IsNullOrWhiteSpace(request.VideoUrl) ? null : request.VideoUrl.Trim(),
            Template: template,
            FrontendPath: frontendPath,
            BackendPath: backendPath);
    }

    internal static void ValidateProjectId(string? id)
    {
        var normalized = id?.Trim();
        if (string.IsNullOrWhiteSpace(normalized) || !ProjectIdRegex.IsMatch(normalized))
        {
            throw new ValidationException("Project id must be a lowercase slug containing only letters, digits, and hyphens.");
        }
    }

    private static ProjectEntryKind NormalizeKind(UpsertProjectPostRequest request)
    {
        if (request.Kind == ProjectEntryKind.Project)
        {
            return ProjectEntryKind.Project;
        }

        return request.Template != TemplateType.None
               || !string.IsNullOrWhiteSpace(request.FrontendPath)
               || !string.IsNullOrWhiteSpace(request.BackendPath)
            ? ProjectEntryKind.Project
            : ProjectEntryKind.Post;
    }

    private static ProjectVisibility NormalizeVisibility(UpsertProjectPostRequest request, ProjectEntryKind kind, TemplateType template)
    {
        if (kind == ProjectEntryKind.Post)
        {
            return ProjectVisibility.Public;
        }

        if (request.Visibility == ProjectVisibility.Private)
        {
            return ProjectVisibility.Private;
        }

        if (request.Visibility == ProjectVisibility.Demo && template == TemplateType.Static)
        {
            return ProjectVisibility.Demo;
        }

        return ProjectVisibility.Public;
    }

    private static ProjectPostContentBlockDto[] NormalizeContentBlocks(ProjectPostContentBlockDto[]? blocks)
    {
        if (blocks is null || blocks.Length == 0)
        {
            return [];
        }

        var normalized = new List<ProjectPostContentBlockDto>();

        foreach (var block in blocks)
        {
            var id = string.IsNullOrWhiteSpace(block.Id) ? Guid.NewGuid().ToString("N") : block.Id.Trim();

            if (block.Type == ProjectPostContentBlockType.Image)
            {
                if (string.IsNullOrWhiteSpace(block.ImageUrl))
                {
                    continue;
                }

                normalized.Add(new ProjectPostContentBlockDto(
                    Id: id,
                    Type: ProjectPostContentBlockType.Image,
                    Content: null,
                    ImageUrl: block.ImageUrl.Trim(),
                    Images: null,
                    VideoUrl: null,
                    PosterUrl: null,
                    PinEnabled: false,
                    ScrollSpan: null));
                continue;
            }

            if (block.Type == ProjectPostContentBlockType.Video)
            {
                if (string.IsNullOrWhiteSpace(block.VideoUrl))
                {
                    continue;
                }

                var enCaption = block.Content?.En.Trim() ?? string.Empty;
                var ruCaption = block.Content?.Ru.Trim() ?? string.Empty;
                var hasCaption = !string.IsNullOrWhiteSpace(enCaption) || !string.IsNullOrWhiteSpace(ruCaption);
                int? scrollSpan = block.PinEnabled
                    ? Math.Clamp(block.ScrollSpan ?? 160, 80, 320)
                    : null;

                normalized.Add(new ProjectPostContentBlockDto(
                    Id: id,
                    Type: ProjectPostContentBlockType.Video,
                    Content: hasCaption ? new LocalizedLongTextDto(enCaption, ruCaption) : null,
                    ImageUrl: null,
                    Images: null,
                    VideoUrl: block.VideoUrl.Trim(),
                    PosterUrl: string.IsNullOrWhiteSpace(block.PosterUrl) ? null : block.PosterUrl.Trim(),
                    PinEnabled: block.PinEnabled,
                    ScrollSpan: scrollSpan));
                continue;
            }

            var en = block.Content?.En.Trim() ?? string.Empty;
            var ru = block.Content?.Ru.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(en) && string.IsNullOrWhiteSpace(ru))
            {
                continue;
            }

            normalized.Add(new ProjectPostContentBlockDto(
                Id: id,
                Type: block.Type,
                Content: new LocalizedLongTextDto(en, ru),
                ImageUrl: null,
                Images: null,
                VideoUrl: null,
                PosterUrl: null,
                PinEnabled: false,
                ScrollSpan: null));
        }

        return normalized.ToArray();
    }

    private static string GetDescriptionFallback(string description, string summary, ProjectPostContentBlockDto[] blocks, string language)
    {
        var normalizedDescription = description.Trim();
        if (!string.IsNullOrWhiteSpace(normalizedDescription))
        {
            return normalizedDescription;
        }

        var fromBlocks = blocks
            .Where(block => block.Type != ProjectPostContentBlockType.Image)
            .Select(block => language == "ru" ? block.Content?.Ru : block.Content?.En)
            .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))
            ?.Trim();

        return !string.IsNullOrWhiteSpace(fromBlocks)
            ? fromBlocks
            : summary.Trim();
    }

    private static LandingContentDto Normalize(UpsertLandingContentRequest request)
    {
        var aboutSubtitle = request.AboutSubtitle is null
            ? new LocalizedTextDto(string.Empty, string.Empty)
            : new LocalizedTextDto(request.AboutSubtitle.En.Trim(), request.AboutSubtitle.Ru.Trim());

        return new LandingContentDto(
            HeroEyebrow: new LocalizedTextDto(request.HeroEyebrow.En.Trim(), request.HeroEyebrow.Ru.Trim()),
            HeroTitle: new LocalizedTextDto(request.HeroTitle.En.Trim(), request.HeroTitle.Ru.Trim()),
            HeroDescription: new LocalizedTextDto(request.HeroDescription.En.Trim(), request.HeroDescription.Ru.Trim()),
            AboutTitle: new LocalizedTextDto(request.AboutTitle.En.Trim(), request.AboutTitle.Ru.Trim()),
            AboutText: new LocalizedTextDto(request.AboutText.En.Trim(), request.AboutText.Ru.Trim()),
            PortfolioTitle: new LocalizedTextDto(request.PortfolioTitle.En.Trim(), request.PortfolioTitle.Ru.Trim()),
            PortfolioText: new LocalizedTextDto(request.PortfolioText.En.Trim(), request.PortfolioText.Ru.Trim()),
            AboutPhoto: string.IsNullOrWhiteSpace(request.AboutPhoto) ? null : request.AboutPhoto.Trim(),
            AboutSubtitle: aboutSubtitle);
    }

    private static void ValidateDto<T>(T request)
    {
        var context = new ValidationContext(request!);
        var results = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(request!, context, results, true);

        if (isValid)
        {
            return;
        }

        var errors = results.Select(r => r.ErrorMessage ?? "Validation error");
        throw new ValidationException(string.Join("; ", errors));
    }
}
