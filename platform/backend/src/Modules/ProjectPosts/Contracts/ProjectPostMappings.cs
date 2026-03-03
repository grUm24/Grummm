using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Contracts;

public static class ProjectPostMappings
{
    public static ProjectPostDto ToDto(ProjectPost project)
    {
        return new ProjectPostDto(
            Id: project.Id,
            Title: new LocalizedTextDto(project.Title.En, project.Title.Ru),
            Summary: new LocalizedTextDto(project.Summary.En, project.Summary.Ru),
            Description: new LocalizedTextDto(project.Description.En, project.Description.Ru),
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
            Title = new LocalizedText { En = dto.Title.En, Ru = dto.Title.Ru },
            Summary = new LocalizedText { En = dto.Summary.En, Ru = dto.Summary.Ru },
            Description = new LocalizedText { En = dto.Description.En, Ru = dto.Description.Ru },
            Tags = dto.Tags,
            HeroImage = new ThemedAsset { Light = dto.HeroImage.Light, Dark = dto.HeroImage.Dark },
            Screenshots = dto.Screenshots.Select(s => new ThemedAsset { Light = s.Light, Dark = s.Dark }).ToArray(),
            VideoUrl = dto.VideoUrl,
            Template = dto.Template,
            FrontendPath = dto.FrontendPath,
            BackendPath = dto.BackendPath
        };
    }
}
