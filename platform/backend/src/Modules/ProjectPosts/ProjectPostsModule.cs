using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Platform.Core.Contracts.Modules;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Domain.Entities;
using Platform.Modules.ProjectPosts.Infrastructure.Repositories;

namespace Platform.Modules.ProjectPosts;

public sealed class ProjectPostsModule : IModule
{
    public void RegisterServices(IServiceCollection services)
    {
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
    }

    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/public/projects");
        var privateGroup = app.MapGroup("/api/app/projects").RequireAuthorization("AdminOnly");

        publicGroup.MapGet("/", async (IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var items = await repository.ListAsync(cancellationToken);
            return Results.Ok(new { items });
        });

        publicGroup.MapGet("/{id}", async (string id, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var item = await repository.GetByIdAsync(id, cancellationToken);
            return item is null ? Results.NotFound() : Results.Ok(item);
        });

        privateGroup.MapGet("/", async (IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var items = await repository.ListAsync(cancellationToken);
            return Results.Ok(new { items });
        });

        privateGroup.MapPost("/", async (UpsertProjectPostRequest request, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            ValidateDto(request);
            var normalized = Normalize(request);
            var created = await repository.UpsertAsync(normalized, cancellationToken);
            return Results.Created($"/api/app/projects/{created.Id}", created);
        });

        privateGroup.MapPut("/{id}", async (string id, UpsertProjectPostRequest request, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            ValidateDto(request);
            var normalized = Normalize(request) with { Id = id.Trim() };
            var updated = await repository.UpsertAsync(normalized, cancellationToken);
            return Results.Ok(updated);
        });

        privateGroup.MapDelete("/{id}", async (string id, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var deleted = await repository.DeleteAsync(id, cancellationToken);
            return deleted ? Results.NoContent() : Results.NotFound();
        });
    }

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
