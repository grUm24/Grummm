using System.Collections.Concurrent;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Infrastructure.Repositories;

public sealed class InMemoryProjectPostRepository : IProjectPostRepository
{
    private readonly ConcurrentDictionary<string, ProjectPost> _storage = new(StringComparer.OrdinalIgnoreCase);
    private LandingContentDto _landingContent = SeedLandingContent();

    public InMemoryProjectPostRepository(string? contentRootPath = null)
    {
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

        ProjectTemplateStorage.ResetProjectFolder(command.Id);
        await ProjectTemplateStorage.SaveTemplateFilesAsync(
            command.Id,
            command.FrontendFiles,
            command.BackendFiles,
            command.TemplateType,
            cancellationToken);

        var updated = ProjectPostMappings.ToDto(existing) with
        {
            Kind = ProjectEntryKind.Project,
            Template = command.TemplateType,
            FrontendPath = ProjectTemplateStorage.GetFrontendPath(command.Id),
            BackendPath = ProjectTemplateStorage.GetBackendPath(command.Id, command.TemplateType)
        };

        _storage[command.Id] = ProjectPostMappings.ToDomain(updated);
        return updated;
    }

    public Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        var removed = _storage.TryRemove(id, out _);
        return Task.FromResult(removed);
    }

    public Task<LandingContentDto> GetLandingContentAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult(_landingContent);
    }

    public Task<LandingContentDto> UpsertLandingContentAsync(LandingContentDto content, CancellationToken cancellationToken)
    {
        _landingContent = content;
        return Task.FromResult(_landingContent);
    }

    private static IEnumerable<ProjectPostDto> SeedPosts()
    {
        yield return new ProjectPostDto(
            Id: "grummm-platform",
            Kind: ProjectEntryKind.Post,
            Title: new LocalizedTextDto("Grummm Platform", "РџР»Р°С‚С„РѕСЂРјР° Grummm"),
            Summary: new LocalizedTextDto(
                "Editorial overview of the modular monolith, showcase layer, and admin workspace.",
                "Р РµРґР°РєС†РёРѕРЅРЅС‹Р№ РѕР±Р·РѕСЂ РїР»Р°С‚С„РѕСЂРјС‹, РІРёС‚СЂРёРЅС‹ Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РёРІРЅРѕР№ СЂР°Р±РѕС‡РµР№ Р·РѕРЅС‹."),
            Description: new LocalizedTextDto(
                "Grummm is a modular monolith platform that separates public posts from runtime-ready projects.",
                "Grummm вЂ” СЌС‚Рѕ РјРѕРґСѓР»СЊРЅР°СЏ РјРѕРЅРѕР»РёС‚РЅР°СЏ РїР»Р°С‚С„РѕСЂРјР°, СЂР°Р·РґРµР»СЏСЋС‰Р°СЏ РїСѓР±Р»РёС‡РЅС‹Рµ РїРѕСЃС‚С‹ Рё runtime-РїСЂРѕРµРєС‚С‹."),
            ContentBlocks:
            [
                new ProjectPostContentBlockDto(
                    Id: "intro",
                    Type: ProjectPostContentBlockType.Paragraph,
                    Content: new LocalizedLongTextDto(
                        "Grummm combines a public showcase, a secure admin area, and runtime-ready modules in one platform.",
                        "Grummm РѕР±СЉРµРґРёРЅСЏРµС‚ РїСѓР±Р»РёС‡РЅСѓСЋ РІРёС‚СЂРёРЅСѓ, Р·Р°С‰РёС‰РµРЅРЅСѓСЋ Р°РґРјРёРЅ-Р·РѕРЅСѓ Рё runtime-РјРѕРґСѓР»Рё РІ РѕРґРЅРѕР№ РїР»Р°С‚С„РѕСЂРјРµ."),
                    ImageUrl: null),
                new ProjectPostContentBlockDto(
                    Id: "architecture",
                    Type: ProjectPostContentBlockType.Subheading,
                    Content: new LocalizedLongTextDto(
                        "Why the platform is modular",
                        "РџРѕС‡РµРјСѓ РїР»Р°С‚С„РѕСЂРјР° РјРѕРґСѓР»СЊРЅР°СЏ"),
                    ImageUrl: null),
                new ProjectPostContentBlockDto(
                    Id: "architecture-copy",
                    Type: ProjectPostContentBlockType.Paragraph,
                    Content: new LocalizedLongTextDto(
                        "Each module keeps its own contracts and infrastructure, so new slices can be connected without rewriting the core.",
                        "РљР°Р¶РґС‹Р№ РјРѕРґСѓР»СЊ С…СЂР°РЅРёС‚ СЃРІРѕРё РєРѕРЅС‚СЂР°РєС‚С‹ Рё РёРЅС„СЂР°СЃС‚СЂСѓРєС‚СѓСЂСѓ, РїРѕСЌС‚РѕРјСѓ РЅРѕРІС‹Рµ СЃСЂРµР·С‹ РјРѕР¶РЅРѕ РїРѕРґРєР»СЋС‡Р°С‚СЊ Р±РµР· РїРµСЂРµРїРёСЃС‹РІР°РЅРёСЏ СЏРґСЂР°."),
                    ImageUrl: null)
            ],
            Tags: ["Showcase", "Modular Monolith", "React", "ASP.NET Core 9", "Docker"],
            HeroImage: new ThemedAssetDto(
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 340'><rect width='600' height='340' fill='%2381A6C6'/></svg>",
                "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 340'><rect width='600' height='340' fill='%231C252E'/></svg>"),
            Screenshots: [],
            VideoUrl: null,
            Template: TemplateType.None,
            FrontendPath: null,
            BackendPath: null);

        yield return new ProjectPostDto(
            Id: "task-tracker",
            Kind: ProjectEntryKind.Project,
            Title: new LocalizedTextDto("Task Tracker", "РўСЂРµРєРµСЂ Р·Р°РґР°С‡"),
            Summary: new LocalizedTextDto(
                "Owner-scoped task board with secure private routes.",
                "Р”РѕСЃРєР° Р·Р°РґР°С‡ СЃ owner-Р»РѕРіРёРєРѕР№ Рё Р·Р°С‰РёС‰РµРЅРЅС‹РјРё РїСЂРёРІР°С‚РЅС‹РјРё РјР°СЂС€СЂСѓС‚Р°РјРё."),
            Description: new LocalizedTextDto(
                "Task tracker module with CQRS handlers, ownership checks and private API routes.",
                "РњРѕРґСѓР»СЊ С‚СЂРµРєРµСЂР° Р·Р°РґР°С‡ СЃ CQRS, РїСЂРѕРІРµСЂРєРѕР№ РІР»Р°РґРµР»СЊС†Р° Рё РїСЂРёРІР°С‚РЅС‹РјРё API-РјР°СЂС€СЂСѓС‚Р°РјРё."),
            ContentBlocks: [],
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
            Template: TemplateType.CSharp,
            FrontendPath: "/templates/csharp",
            BackendPath: "/services/csharp");
    }

    private static LandingContentDto SeedLandingContent()
    {
        return new LandingContentDto(
            HeroEyebrow: new LocalizedTextDto("GRUMMM PLATFORM", "GRUMMM PLATFORM"),
            HeroTitle: new LocalizedTextDto(
                "A platform where projects become live demonstrations.",
                "РџР»Р°С‚С„РѕСЂРјР°, РіРґРµ РїСЂРѕРµРєС‚С‹ РїСЂРµРІСЂР°С‰Р°СЋС‚СЃСЏ РІ Р¶РёРІС‹Рµ РґРµРјРѕРЅСЃС‚СЂР°С†РёРё."),
            HeroDescription: new LocalizedTextDto(
                "Grummm.ru is a personal showcase with a public portfolio and private admin area where I manage projects, templates, and content.",
                "Grummm.ru вЂ” СЌС‚Рѕ РїРµСЂСЃРѕРЅР°Р»СЊРЅР°СЏ РІРёС‚СЂРёРЅР° СЃ РїСѓР±Р»РёС‡РЅС‹Рј РїРѕСЂС‚С„РѕР»РёРѕ Рё РїСЂРёРІР°С‚РЅРѕР№ Р°РґРјРёРЅ-Р·РѕРЅРѕР№, РіРґРµ СЏ СѓРїСЂР°РІР»СЏСЋ РїСЂРѕРµРєС‚Р°РјРё, С€Р°Р±Р»РѕРЅР°РјРё Рё РєРѕРЅС‚РµРЅС‚РѕРј."),
            AboutTitle: new LocalizedTextDto("About Me", "РћР±Рѕ РјРЅРµ"),
            AboutText: new LocalizedTextDto(
                "I build practical web products end-to-end: from idea and interface to backend logic and deployment. This page shows my latest work and architecture approach.",
                "РЇ СЃРѕР·РґР°СЋ РїСЂРёРєР»Р°РґРЅС‹Рµ РІРµР±-РїСЂРѕРµРєС‚С‹: РѕС‚ РёРґРµРё Рё РёРЅС‚РµСЂС„РµР№СЃР° РґРѕ backend-Р»РѕРіРёРєРё Рё РґРµРїР»РѕСЏ. РќР° СЌС‚РѕР№ СЃС‚СЂР°РЅРёС†Рµ РІС‹ РІРёРґРёС‚Рµ РјРѕРё Р°РєС‚СѓР°Р»СЊРЅС‹Рµ СЂР°Р±РѕС‚С‹ Рё РїРѕРґС…РѕРґ Рє Р°СЂС…РёС‚РµРєС‚СѓСЂРµ."),
            PortfolioTitle: new LocalizedTextDto("Portfolio", "РџРѕСЂС‚С„РѕР»РёРѕ"),
            PortfolioText: new LocalizedTextDto(
                "The portfolio includes projects with multiple templates: static, JavaScript, C#, and Python. Each one can be opened, explored, and reviewed in action.",
                "Р’ РїРѕСЂС‚С„РѕР»РёРѕ вЂ” РїСЂРѕРµРєС‚С‹ СЃ СЂР°Р·РЅС‹РјРё С€Р°Р±Р»РѕРЅР°РјРё: static, JavaScript, C#, Python. РљР°Р¶РґС‹Р№ РјРѕР¶РЅРѕ РѕС‚РєСЂС‹С‚СЊ, РёР·СѓС‡РёС‚СЊ Рё РѕС†РµРЅРёС‚СЊ РІ СЂР°Р±РѕС‚Рµ."),
            AboutPhoto: null);
    }
}