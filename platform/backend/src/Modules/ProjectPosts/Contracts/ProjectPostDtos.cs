using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Contracts;

public sealed record LocalizedTextDto(
    [property: Required, MaxLength(200)] string En,
    [property: Required, MaxLength(200)] string Ru);

public sealed record LocalizedLongTextDto(
    [property: Required, MaxLength(20_000)] string En,
    [property: Required, MaxLength(20_000)] string Ru);

public sealed record ThemedAssetDto(
    [property: Required, MaxLength(2_000_000)] string Light,
    [property: Required, MaxLength(2_000_000)] string Dark);

public sealed record ProjectPostContentBlockDto(
    [property: Required, MaxLength(80)] string Id,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ProjectPostContentBlockType>))] ProjectPostContentBlockType Type,
    LocalizedLongTextDto? Content,
    [property: MaxLength(5_000_000)] string? ImageUrl,
    string[]? Images,
    [property: MaxLength(5_000_000)] string? VideoUrl,
    [property: MaxLength(5_000_000)] string? PosterUrl,
    bool PinEnabled,
    [property: Range(80, 320)] int? ScrollSpan);

public sealed record ProjectPostDto(
    [property: Required, MaxLength(80)] string Id,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ProjectEntryKind>))] ProjectEntryKind Kind,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ProjectVisibility>))] ProjectVisibility Visibility,
    LocalizedTextDto Title,
    LocalizedTextDto Summary,
    LocalizedTextDto Description,
    DateTimeOffset? PublishedAt,
    ProjectPostContentBlockDto[] ContentBlocks,
    string[] Tags,
    bool PublicDemoEnabled,
    ThemedAssetDto HeroImage,
    ThemedAssetDto[] Screenshots,
    string? VideoUrl,
    [property: JsonConverter(typeof(JsonStringEnumConverter<TemplateType>))] TemplateType Template,
    [property: MaxLength(500)] string? FrontendPath,
    [property: MaxLength(500)] string? BackendPath);

public sealed record TopicDto(
    [property: Required, MaxLength(80)] string Id,
    LocalizedTextDto Name);

public sealed record UpsertTopicRequest(
    [property: Required, MaxLength(80), RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$")] string Id,
    LocalizedTextDto Name);

public sealed record SetProjectRelationsRequest(
    [property: Required] string[] TargetIds);

public sealed record SetProjectTopicsRequest(
    [property: Required] string[] TopicIds);

public sealed record RelatedProjectDto(
    string Id,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ProjectEntryKind>))] ProjectEntryKind Kind,
    LocalizedTextDto Title,
    LocalizedTextDto Summary,
    ThemedAssetDto HeroImage,
    string[] SharedTopics);

public sealed record UpsertProjectPostRequest(
    [property: Required, MaxLength(80), RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$")] string Id,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ProjectEntryKind>))] ProjectEntryKind Kind,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ProjectVisibility>))] ProjectVisibility Visibility,
    LocalizedTextDto Title,
    LocalizedTextDto Summary,
    LocalizedTextDto Description,
    DateTimeOffset? PublishedAt,
    ProjectPostContentBlockDto[]? ContentBlocks,
    string[]? Tags,
    bool PublicDemoEnabled,
    ThemedAssetDto HeroImage,
    ThemedAssetDto[]? Screenshots,
    [property: MaxLength(5_000_000)] string? VideoUrl,
    [property: JsonConverter(typeof(JsonStringEnumConverter<TemplateType>))] TemplateType Template,
    [property: MaxLength(500)] string? FrontendPath,
    [property: MaxLength(500)] string? BackendPath);
