using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Contracts;

namespace Platform.Modules.ProjectPosts.Application.Repositories;

public interface IProjectPostRepository
{
    Task<IReadOnlyList<ProjectPostDto>> ListAsync(CancellationToken cancellationToken);
    Task<ProjectPostDto?> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<ProjectPostDto> UpsertAsync(ProjectPostDto post, CancellationToken cancellationToken);
    Task<ProjectPostDto?> UploadWithTemplateAsync(UploadWithTemplateCommand command, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    Task<LandingContentDto> GetLandingContentAsync(CancellationToken cancellationToken);
    Task<LandingContentDto> UpsertLandingContentAsync(LandingContentDto content, CancellationToken cancellationToken);

    // Topics
    Task<IReadOnlyList<TopicDto>> ListTopicsAsync(CancellationToken cancellationToken);
    Task<TopicDto> UpsertTopicAsync(TopicDto topic, CancellationToken cancellationToken);
    Task<bool> DeleteTopicAsync(string id, CancellationToken cancellationToken);

    // Project ↔ Topic
    Task<string[]> GetProjectTopicIdsAsync(string projectId, CancellationToken cancellationToken);
    Task SetProjectTopicsAsync(string projectId, string[] topicIds, CancellationToken cancellationToken);

    // Project ↔ Project relations
    Task<string[]> GetProjectRelationIdsAsync(string projectId, CancellationToken cancellationToken);
    Task SetProjectRelationsAsync(string projectId, string[] targetIds, CancellationToken cancellationToken);

    // Recommendations
    Task<IReadOnlyList<RelatedProjectDto>> GetRelatedAsync(string projectId, int limit, CancellationToken cancellationToken);
}
