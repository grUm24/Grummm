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
    [property: MaxLength(5_000_000)] string? ImageUrl);

public sealed record ProjectPostDto(
    [property: Required, MaxLength(80)] string Id,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ProjectEntryKind>))] ProjectEntryKind Kind,
    LocalizedTextDto Title,
    LocalizedTextDto Summary,
    LocalizedTextDto Description,
    ProjectPostContentBlockDto[] ContentBlocks,
    string[] Tags,
    ThemedAssetDto HeroImage,
    ThemedAssetDto[] Screenshots,
    string? VideoUrl,
    [property: JsonConverter(typeof(JsonStringEnumConverter<TemplateType>))] TemplateType Template,
    [property: MaxLength(500)] string? FrontendPath,
    [property: MaxLength(500)] string? BackendPath);

public sealed record UpsertProjectPostRequest(
    [property: Required, MaxLength(80)] string Id,
    [property: JsonConverter(typeof(JsonStringEnumConverter<ProjectEntryKind>))] ProjectEntryKind Kind,
    LocalizedTextDto Title,
    LocalizedTextDto Summary,
    LocalizedTextDto Description,
    ProjectPostContentBlockDto[]? ContentBlocks,
    string[]? Tags,
    ThemedAssetDto HeroImage,
    ThemedAssetDto[]? Screenshots,
    [property: MaxLength(5_000_000)] string? VideoUrl,
    [property: JsonConverter(typeof(JsonStringEnumConverter<TemplateType>))] TemplateType Template = TemplateType.None,
    [property: MaxLength(500)] string? FrontendPath = null,
    [property: MaxLength(500)] string? BackendPath = null);
