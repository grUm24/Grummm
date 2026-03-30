using System.Collections.Concurrent;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Infrastructure.Repositories;

public sealed class InMemoryProjectPostRepository : IProjectPostRepository
{
    private readonly ConcurrentDictionary<string, ProjectPost> _storage = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, TopicDto> _topics = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, HashSet<string>> _projectTopics = new(StringComparer.OrdinalIgnoreCase);
    private readonly ConcurrentDictionary<string, HashSet<string>> _projectRelations = new(StringComparer.OrdinalIgnoreCase);
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

    // ── Topics ──

    public Task<IReadOnlyList<TopicDto>> ListTopicsAsync(CancellationToken cancellationToken)
    {
        var list = _topics.Values.OrderBy(t => t.Name.En).ToArray();
        return Task.FromResult<IReadOnlyList<TopicDto>>(list);
    }

    public Task<TopicDto> UpsertTopicAsync(TopicDto topic, CancellationToken cancellationToken)
    {
        _topics[topic.Id] = topic;
        return Task.FromResult(topic);
    }

    public Task<bool> DeleteTopicAsync(string id, CancellationToken cancellationToken)
    {
        var removed = _topics.TryRemove(id, out _);
        foreach (var set in _projectTopics.Values) set.Remove(id);
        return Task.FromResult(removed);
    }

    // ── Project ↔ Topic ──

    public Task<string[]> GetProjectTopicIdsAsync(string projectId, CancellationToken cancellationToken)
    {
        return Task.FromResult(_projectTopics.TryGetValue(projectId, out var set) ? set.ToArray() : Array.Empty<string>());
    }

    public Task SetProjectTopicsAsync(string projectId, string[] topicIds, CancellationToken cancellationToken)
    {
        _projectTopics[projectId] = new HashSet<string>(topicIds, StringComparer.OrdinalIgnoreCase);
        return Task.CompletedTask;
    }

    // ── Project ↔ Project relations ──

    public Task<string[]> GetProjectRelationIdsAsync(string projectId, CancellationToken cancellationToken)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (_projectRelations.TryGetValue(projectId, out var targets)) result.UnionWith(targets);
        foreach (var (source, set) in _projectRelations)
            if (set.Contains(projectId)) result.Add(source);
        result.Remove(projectId);
        return Task.FromResult(result.ToArray());
    }

    public Task SetProjectRelationsAsync(string projectId, string[] targetIds, CancellationToken cancellationToken)
    {
        // Remove existing
        _projectRelations.TryRemove(projectId, out _);
        foreach (var set in _projectRelations.Values) set.Remove(projectId);
        // Add new
        if (targetIds.Length > 0)
            _projectRelations[projectId] = new HashSet<string>(targetIds.Where(t => !string.Equals(t, projectId, StringComparison.OrdinalIgnoreCase)), StringComparer.OrdinalIgnoreCase);
        return Task.CompletedTask;
    }

    // ── Recommendations ──

    public async Task<IReadOnlyList<RelatedProjectDto>> GetRelatedAsync(string projectId, int limit, CancellationToken cancellationToken)
    {
        var all = await ListAsync(cancellationToken);
        var relationIds = await GetProjectRelationIdsAsync(projectId, cancellationToken);
        var topicIds = await GetProjectTopicIdsAsync(projectId, cancellationToken);
        var currentKind = all.FirstOrDefault(p => string.Equals(p.Id, projectId, StringComparison.OrdinalIgnoreCase))?.Kind;

        var relationSet = new HashSet<string>(relationIds, StringComparer.OrdinalIgnoreCase);
        var topicSet = new HashSet<string>(topicIds, StringComparer.OrdinalIgnoreCase);

        return all
            .Where(p => !string.Equals(p.Id, projectId, StringComparison.OrdinalIgnoreCase)
                && (p.Kind == ProjectEntryKind.Post || p.Visibility != ProjectVisibility.Private))
            .Select(p =>
            {
                var pTopics = _projectTopics.TryGetValue(p.Id, out var ts) ? ts : new HashSet<string>();
                var shared = pTopics.Where(topicSet.Contains).ToArray();
                var score = (relationSet.Contains(p.Id) ? 100 : 0) + shared.Length * 10 + (p.Kind == currentKind ? 1 : 0);
                return (Item: p, Score: score, SharedTopics: shared);
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(limit)
            .Select(x => new RelatedProjectDto(x.Item.Id, x.Item.Kind, x.Item.Title, x.Item.Summary, x.Item.HeroImage, x.SharedTopics))
            .ToArray();
    }

    private static IEnumerable<ProjectPostDto> SeedPosts()
    {
        yield return new ProjectPostDto(
            Id: "grummm-platform",
            Kind: ProjectEntryKind.Post,
            Visibility: ProjectVisibility.Public,
            Title: new LocalizedTextDto("Grummm Platform", "Платформа Grummm"),
            Summary: new LocalizedTextDto(
                "Editorial overview of the modular monolith, showcase layer, and admin workspace.",
                "Редакционный обзор модульного монолита, публичной витрины и рабочей админ-зоны."),
            Description: new LocalizedTextDto(
                "Grummm is a modular monolith platform that separates public posts from runtime-ready projects.",
                "Grummm — модульная монолитная платформа, которая разделяет публичные посты и проекты, готовые к демо."),
            PublishedAt: new DateTimeOffset(2026, 3, 16, 9, 30, 0, TimeSpan.Zero),
            ContentBlocks:
            [
                new ProjectPostContentBlockDto(
                    Id: "intro",
                    Type: ProjectPostContentBlockType.Paragraph,
                    Content: new LocalizedLongTextDto(
                        "Grummm combines a public showcase, a secure admin area, and runtime-ready modules in one platform.",
                        "Grummm объединяет публичную витрину, защищенную админ-зону и модульную архитектуру в одной платформе."),
                    ImageUrl: null,
                    VideoUrl: null,
                    PosterUrl: null,
                    PinEnabled: false,
                    ScrollSpan: null),
                new ProjectPostContentBlockDto(
                    Id: "architecture",
                    Type: ProjectPostContentBlockType.Subheading,
                    Content: new LocalizedLongTextDto(
                        "Why the platform is modular",
                        "Почему платформа модульная"),
                    ImageUrl: null,
                    VideoUrl: null,
                    PosterUrl: null,
                    PinEnabled: false,
                    ScrollSpan: null),
                new ProjectPostContentBlockDto(
                    Id: "architecture-copy",
                    Type: ProjectPostContentBlockType.Paragraph,
                    Content: new LocalizedLongTextDto(
                        "Each module keeps its own contracts and infrastructure, so new slices can be connected without rewriting the core.",
                        "Каждый модуль хранит свои контракты и инфраструктуру, поэтому новые срезы можно подключать без переписывания ядра."),
                    ImageUrl: null,
                    VideoUrl: null,
                    PosterUrl: null,
                    PinEnabled: false,
                    ScrollSpan: null)
            ],
            Tags: ["Showcase", "Modular Monolith", "React", "ASP.NET Core 9", "Docker"],
            PublicDemoEnabled: false,
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
            Visibility: ProjectVisibility.Public,
            Title: new LocalizedTextDto("Task Tracker", "Трекер задач"),
            Summary: new LocalizedTextDto(
                "Owner-scoped task board with secure private routes.",
                "Доска задач с разграничением по владельцу и защищенными приватными маршрутами."),
            Description: new LocalizedTextDto(
                "Task tracker module with CQRS handlers, ownership checks and private API routes.",
                "Модуль task tracker с обработчиками CQRS, проверками владения и приватными API-маршрутами."),
            PublishedAt: null,
            ContentBlocks: [],
            Tags: ["React", ".NET", "CQRS"],
            PublicDemoEnabled: false,
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
}
