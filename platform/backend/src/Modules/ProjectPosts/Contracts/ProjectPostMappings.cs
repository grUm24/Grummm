using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Contracts;

public static class ProjectPostMappings
{
    private static bool HasContent(ProjectPostContentBlock block)
    {
        return !string.IsNullOrWhiteSpace(block.Content.En) || !string.IsNullOrWhiteSpace(block.Content.Ru);
    }

    public static ProjectPostDto ToDto(ProjectPost project)
    {
        return new ProjectPostDto(
            Id: project.Id,
            Kind: project.Kind,
            Visibility: project.Visibility,
            Title: new LocalizedTextDto(project.Title.En, project.Title.Ru),
            Summary: new LocalizedTextDto(project.Summary.En, project.Summary.Ru),
            Description: new LocalizedTextDto(project.Description.En, project.Description.Ru),
            PublishedAt: project.PublishedAt,
            ContentBlocks: project.ContentBlocks.Select(ToDto).ToArray(),
            Tags: project.Tags,
            PublicDemoEnabled: project.PublicDemoEnabled,
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
            Visibility = dto.Visibility,
            Title = new LocalizedText { En = dto.Title.En, Ru = dto.Title.Ru },
            Summary = new LocalizedText { En = dto.Summary.En, Ru = dto.Summary.Ru },
            Description = new LocalizedText { En = dto.Description.En, Ru = dto.Description.Ru },
            PublishedAt = dto.PublishedAt,
            ContentBlocks = dto.ContentBlocks.Select(ToDomain).ToArray(),
            Tags = dto.Tags,
            PublicDemoEnabled = dto.PublicDemoEnabled,
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
        var skipContent = block.Type is ProjectPostContentBlockType.Image or ProjectPostContentBlockType.Collage;
        return new ProjectPostContentBlockDto(
            Id: block.Id,
            Type: block.Type,
            Content: skipContent || !HasContent(block)
                ? null
                : new LocalizedLongTextDto(block.Content.En, block.Content.Ru),
            ImageUrl: block.ImageUrl,
            Images: block.Images,
            VideoUrl: block.VideoUrl,
            PosterUrl: block.PosterUrl,
            PinEnabled: block.PinEnabled,
            ScrollSpan: block.ScrollSpan);
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
            ImageUrl = block.ImageUrl,
            Images = block.Images,
            VideoUrl = block.VideoUrl,
            PosterUrl = block.PosterUrl,
            PinEnabled = block.PinEnabled,
            ScrollSpan = block.ScrollSpan
        };
    }
}
