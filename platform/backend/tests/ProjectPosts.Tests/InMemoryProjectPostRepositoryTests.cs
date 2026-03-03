using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;
using Platform.Modules.ProjectPosts.Infrastructure.Repositories;
using Xunit;

namespace ProjectPosts.Tests;

public sealed class InMemoryProjectPostRepositoryTests
{
    [Fact]
    public async Task Upsert_WithJavaScriptTemplate_PersistsTemplateAndPaths()
    {
        var repository = new InMemoryProjectPostRepository();

        var post = new ProjectPostDto(
            Id: "js-template-post",
            Title: new LocalizedTextDto("JS template", "JS шаблон"),
            Summary: new LocalizedTextDto("Summary", "Кратко"),
            Description: new LocalizedTextDto("Description", "Описание"),
            Tags: ["javascript", "template"],
            HeroImage: new ThemedAssetDto("light", "dark"),
            Screenshots: [new ThemedAssetDto("s1", "s1")],
            VideoUrl: null,
            Template: TemplateType.JavaScript,
            FrontendPath: "/templates/js",
            BackendPath: "/services/js");

        await repository.UpsertAsync(post, CancellationToken.None);
        var saved = await repository.GetByIdAsync(post.Id, CancellationToken.None);

        Assert.NotNull(saved);
        Assert.Equal(TemplateType.JavaScript, saved!.Template);
        Assert.Equal("/templates/js", saved.FrontendPath);
        Assert.Equal("/services/js", saved.BackendPath);
    }
}
