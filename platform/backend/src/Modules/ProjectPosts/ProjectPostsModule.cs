using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Platform.Core.Contracts.Modules;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Application.Security;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;
using Platform.Modules.ProjectPosts.Infrastructure.Repositories;
using Platform.Modules.ProjectPosts.Infrastructure.Security;

namespace Platform.Modules.ProjectPosts;

public sealed partial class ProjectPostsModule : IModule
{
    public void RegisterServices(IServiceCollection services)
    {
        services.AddOptions<ClamAvOptions>()
            .BindConfiguration("ClamAv");
        services.AddSingleton<IProjectFileMalwareScanner, ClamAvNetProjectFileMalwareScanner>();

        services.AddSingleton<IProjectPostRepository>(serviceProvider =>
        {
            var configuration = serviceProvider.GetRequiredService<IConfiguration>();
            var connectionString = configuration.GetConnectionString("Platform");

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return new InMemoryProjectPostRepository();
            }

            return new PostgresProjectPostRepository(connectionString);
        });
        services.AddSingleton<UploadWithTemplateCommandHandler>();
    }

    public partial void MapEndpoints(IEndpointRouteBuilder app);

    private static ProjectPostDto Normalize(UpsertProjectPostRequest request)
    {
        var tags = (request.Tags ?? Array.Empty<string>())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var screenshots = (request.Screenshots is { Length: > 0 } ? request.Screenshots : [request.HeroImage])
            .Select(s => new ThemedAssetDto(
                Light: s.Light.Trim(),
                Dark: s.Dark.Trim()))
            .ToArray();

        return new ProjectPostDto(
            Id: request.Id.Trim(),
            Title: new LocalizedTextDto(request.Title.En.Trim(), request.Title.Ru.Trim()),
            Summary: new LocalizedTextDto(request.Summary.En.Trim(), request.Summary.Ru.Trim()),
            Description: new LocalizedTextDto(request.Description.En.Trim(), request.Description.Ru.Trim()),
            Tags: tags,
            HeroImage: new ThemedAssetDto(request.HeroImage.Light.Trim(), request.HeroImage.Dark.Trim()),
            Screenshots: screenshots,
            VideoUrl: string.IsNullOrWhiteSpace(request.VideoUrl) ? null : request.VideoUrl.Trim(),
            Template: Enum.IsDefined(request.Template) ? request.Template : TemplateType.None,
            FrontendPath: string.IsNullOrWhiteSpace(request.FrontendPath) ? null : request.FrontendPath.Trim(),
            BackendPath: string.IsNullOrWhiteSpace(request.BackendPath) ? null : request.BackendPath.Trim());
    }

    private static void ValidateDto<T>(T request)
    {
        var context = new ValidationContext(request!);
        var results = new List<ValidationResult>();
        var isValid = Validator.TryValidateObject(request!, context, results, true);

        if (isValid)
        {
            return;
        }

        var errors = results.Select(r => r.ErrorMessage ?? "Validation error");
        throw new ValidationException(string.Join("; ", errors));
    }
}
