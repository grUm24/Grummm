using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Contracts;

public static class ProjectPostMappings
{
    public static ProjectPostDto ToDto(ProjectPost project)
    {
        return new ProjectPostDto(
            Id: project.Id,
            Kind: project.Kind,
            Title: new LocalizedTextDto(project.Title.En, project.Title.Ru),
            Summary: new LocalizedTextDto(project.Summary.En, project.Summary.Ru),
            Description: new LocalizedTextDto(project.Description.En, project.Description.Ru),
            ContentBlocks: project.ContentBlocks.Select(ToDto).ToArray(),
            Tags: project.Tags,
            HeroImage: new ThemedAssetDto(project.HeroImage.Light, project.HeroImage.Dark),
            Screenshots: project.Screenshots.Select(s => new ThemedAssetDto(s.Light, s.Dark)).ToArray(),
            VideoUrl: project.VideoUrl,
            Template: project.Template,
            FrontendPath: project.FrontendPath,
            BackendPath: project.BackendPath);
    }

    public static ProjectPost ToDomain(ProjectPostDto dto)
    {
        return new ProjectPost
        {
            Id = dto.Id,
            Kind = dto.Kind,
            Title = new LocalizedText { En = dto.Title.En, Ru = dto.Title.Ru },
            Summary = new LocalizedText { En = dto.Summary.En, Ru = dto.Summary.Ru },
            Description = new LocalizedText { En = dto.Description.En, Ru = dto.Description.Ru },
            ContentBlocks = dto.ContentBlocks.Select(ToDomain).ToArray(),
            Tags = dto.Tags,
            HeroImage = new ThemedAsset { Light = dto.HeroImage.Light, Dark = dto.HeroImage.Dark },
            Screenshots = dto.Screenshots.Select(s => new ThemedAsset { Light = s.Light, Dark = s.Dark }).ToArray(),
            VideoUrl = dto.VideoUrl,
            Template = dto.Template,
            FrontendPath = dto.FrontendPath,
            BackendPath = dto.BackendPath
        };
    }

    private static ProjectPostContentBlockDto ToDto(ProjectPostContentBlock block)
    {
        return new ProjectPostContentBlockDto(
            Id: block.Id,
            Type: block.Type,
            Content: block.Type == ProjectPostContentBlockType.Image ? null : new LocalizedLongTextDto(block.Content.En, block.Content.Ru),
            ImageUrl: block.ImageUrl);
    }

    private static ProjectPostContentBlock ToDomain(ProjectPostContentBlockDto block)
    {
        return new ProjectPostContentBlock
        {
            Id = block.Id,
            Type = block.Type,
            Content = new LocalizedText
            {
                En = block.Content?.En ?? string.Empty,
                Ru = block.Content?.Ru ?? string.Empty
            },
            ImageUrl = block.ImageUrl
        };
    }
}