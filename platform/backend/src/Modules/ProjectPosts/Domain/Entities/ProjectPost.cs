namespace Platform.Modules.ProjectPosts.Domain.Entities;

public enum TemplateType
{
    None = 0,
    Static = 1,
    CSharp = 2,
    Python = 3,
    JavaScript = 4
}

public enum ProjectEntryKind
{
    Post = 0,
    Project = 1
}

public enum ProjectVisibility
{
    Public = 0,
    Private = 1,
    Demo = 2
}

public enum ProjectPostContentBlockType
{
    Paragraph = 0,
    Subheading = 1,
    Image = 2,
    Video = 3,
    NumberedList = 4,
    Callout = 5
}

public sealed class LocalizedText
{
    public string En { get; set; } = string.Empty;
    public string Ru { get; set; } = string.Empty;
}

public sealed class ThemedAsset
{
    public string Light { get; set; } = string.Empty;
    public string Dark { get; set; } = string.Empty;
}

public sealed class ProjectPostContentBlock
{
    public string Id { get; set; } = string.Empty;
    public ProjectPostContentBlockType Type { get; set; } = ProjectPostContentBlockType.Paragraph;
    public LocalizedText Content { get; set; } = new();
    public string? ImageUrl { get; set; }
    public string? VideoUrl { get; set; }
    public string? PosterUrl { get; set; }
    public bool PinEnabled { get; set; }
    public int? ScrollSpan { get; set; }
}

public sealed class ProjectPost
{
    public string Id { get; set; } = string.Empty;
    public ProjectEntryKind Kind { get; set; } = ProjectEntryKind.Post;
    public ProjectVisibility Visibility { get; set; } = ProjectVisibility.Public;
    public LocalizedText Title { get; set; } = new();
    public LocalizedText Summary { get; set; } = new();
    public LocalizedText Description { get; set; } = new();
    public DateTimeOffset? PublishedAt { get; set; }
    public ProjectPostContentBlock[] ContentBlocks { get; set; } = [];
    public string[] Tags { get; set; } = [];
    public bool PublicDemoEnabled { get; set; }
    public ThemedAsset HeroImage { get; set; } = new();
    public ThemedAsset[] Screenshots { get; set; } = [];
    public string? VideoUrl { get; set; }

    public TemplateType Template { get; set; } = TemplateType.None;
    public string? FrontendPath { get; set; }
    public string? BackendPath { get; set; }
}
