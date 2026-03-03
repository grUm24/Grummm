namespace Platform.Modules.ProjectPosts.Domain.Entities;

public enum TemplateType
{
    None = 0,
    Static = 1,
    CSharp = 2,
    Python = 3,
    JavaScript = 4
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

public sealed class ProjectPost
{
    public string Id { get; set; } = string.Empty;
    public LocalizedText Title { get; set; } = new();
    public LocalizedText Summary { get; set; } = new();
    public LocalizedText Description { get; set; } = new();
    public string[] Tags { get; set; } = [];
    public ThemedAsset HeroImage { get; set; } = new();
    public ThemedAsset[] Screenshots { get; set; } = [];
    public string? VideoUrl { get; set; }

    // Template metadata baseline for future validation/upload workflow.
    public TemplateType Template { get; set; } = TemplateType.None;
    public string? FrontendPath { get; set; }
    public string? BackendPath { get; set; }
}
