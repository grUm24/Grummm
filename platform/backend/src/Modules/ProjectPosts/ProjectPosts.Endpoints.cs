using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Platform.Modules.ProjectPosts.Application.Commands;
using Platform.Modules.ProjectPosts.Application.Plugins;
using Platform.Modules.ProjectPosts.Application.Repositories;
using Platform.Modules.ProjectPosts.Contracts;
using Platform.Modules.ProjectPosts.Infrastructure.Repositories;

namespace Platform.Modules.ProjectPosts;

public sealed partial class ProjectPostsModule
{
    public partial void MapEndpoints(IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/public/projects");
        var privateGroup = app.MapGroup("/api/app/projects").RequireAuthorization("AdminOnly");
        var publicContentGroup = app.MapGroup("/api/public/content");
        var privateContentGroup = app.MapGroup("/api/app/content").RequireAuthorization("AdminOnly");

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

        publicContentGroup.MapGet("/landing", async (IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            var content = await repository.GetLandingContentAsync(cancellationToken);
            return Results.Ok(content);
        });

        privateContentGroup.MapPut("/landing", async (UpsertLandingContentRequest request, IProjectPostRepository repository, CancellationToken cancellationToken) =>
        {
            ValidateDto(request);
            var normalized = Normalize(request);
            var updated = await repository.UpsertLandingContentAsync(normalized, cancellationToken);
            return Results.Ok(updated);
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

        privateGroup.MapPost("/{id}/upload-with-template",
            async (
                string id,
                HttpRequest httpRequest,
                UploadWithTemplateCommandHandler commandHandler,
                CancellationToken cancellationToken) =>
            {
                if (!httpRequest.HasFormContentType)
                {
                    throw new ValidationException("Content-Type must be multipart/form-data.");
                }

                var form = await httpRequest.ReadFormAsync(cancellationToken);

                var request = new UploadWithTemplateRequest(
                    TemplateType: form["templateType"].ToString(),
                    FrontendFiles: form.Files
                        .Where(f => string.Equals(f.Name, "frontendFiles", StringComparison.Ordinal))
                        .ToArray(),
                    BackendFiles: form.Files
                        .Where(f => string.Equals(f.Name, "backendFiles", StringComparison.Ordinal))
                        .ToArray());

                ValidateDto(request);
                var command = UploadWithTemplateMappings.ToCommand(
                    id: id,
                    request: request,
                    correlationId: httpRequest.HttpContext.TraceIdentifier,
                    performedByUserId: httpRequest.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "unknown",
                    performedByUserName: httpRequest.HttpContext.User.FindFirstValue(ClaimTypes.Name));
                var updated = await commandHandler.HandleAsync(command, cancellationToken);

                return updated is null ? Results.NotFound() : Results.Ok(updated);
            });

        var dynamicPluginGroup = app.MapGroup("/api/app/{slug}").RequireAuthorization("AdminOnly");
        dynamicPluginGroup.MapMethods("/{**pluginPath}",
            ["GET", "POST", "PUT", "PATCH", "DELETE"],
            async (
                string slug,
                string? pluginPath,
                HttpContext httpContext,
                ICSharpTemplatePluginRuntime pluginRuntime,
                IPythonTemplateRuntime pythonRuntime,
                CancellationToken cancellationToken) =>
            {
                if (string.Equals(slug, "projects", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(slug, "tasks", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(slug, "auth", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(slug, "security", StringComparison.OrdinalIgnoreCase))
                {
                    return Results.NotFound();
                }

                var dispatchPath = "/" + (pluginPath ?? string.Empty);
                var dispatchResult = await pluginRuntime.DispatchAsync(
                    slug,
                    dispatchPath,
                    httpContext.Request.Method,
                    httpContext,
                    cancellationToken);

                if (dispatchResult is not null)
                {
                    return dispatchResult;
                }

                var pythonResult = await pythonRuntime.DispatchAsync(
                    slug,
                    dispatchPath,
                    httpContext.Request.Method,
                    httpContext,
                    cancellationToken);

                return pythonResult ?? Results.NotFound();
            });

        privateGroup.MapDelete("/{id}", async (
            string id,
            IProjectPostRepository repository,
            ICSharpTemplatePluginRuntime pluginRuntime,
            IPythonTemplateRuntime pythonRuntime,
            CancellationToken cancellationToken) =>
        {
            await pluginRuntime.UnloadForSlugAsync(id, cancellationToken);
            await pythonRuntime.UnloadForSlugAsync(id, cancellationToken);
            var deleted = await repository.DeleteAsync(id, cancellationToken);

            if (deleted)
            {
                ProjectTemplateStorage.ResetProjectFolder(id);
            }

            return deleted ? Results.NoContent() : Results.NotFound();
        });
    }
}
