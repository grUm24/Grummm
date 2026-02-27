using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Platform.Modules.TaskTracker.Application.Commands;
using Platform.Modules.TaskTracker.Application.Queries;
using Platform.Modules.TaskTracker.Application.Repositories;
using Platform.Core.Contracts.Security;
using Platform.Core.Contracts.Modules;
using Platform.Modules.TaskTracker.Contracts;
using Platform.Modules.TaskTracker.Infrastructure.Repositories;

namespace Platform.Modules.TaskTracker;

public sealed class TaskTrackerModule : IModule
{
    public void RegisterServices(IServiceCollection services)
    {
        services.AddSingleton<ITaskItemRepository, InMemoryTaskItemRepository>();
        services.AddSingleton<CreateTaskCommandHandler>();
        services.AddSingleton<CompleteTaskCommandHandler>();
        services.AddSingleton<GetTasksQueryHandler>();
        services.AddSingleton<GetTaskByIdQueryHandler>();
    }

    public void MapEndpoints(IEndpointRouteBuilder app)
    {
        var publicGroup = app.MapGroup("/api/public/tasks");
        var privateGroup = app.MapGroup("/api/app/tasks").RequireAuthorization("AdminOnly");

        publicGroup.MapGet("/", async (ITaskItemRepository repository, CancellationToken cancellationToken) =>
        {
            var total = await repository.CountAllAsync(cancellationToken);
            return Results.Ok(new
            {
                module = "TaskTracker",
                area = "public",
                totalTasks = total
            });
        });

        privateGroup.MapGet("/", () => Results.Ok(new
        {
            module = "TaskTracker",
            area = "private",
            message = "TaskTracker private API"
        }));

        privateGroup.MapGet("/{ownerUserId}", async (HttpContext context, string ownerUserId, GetTasksQueryHandler queryHandler, CancellationToken cancellationToken) =>
        {
            if (!HasOwnerAccess(context, ownerUserId))
            {
                return Results.Forbid();
            }

            var tasks = await queryHandler.HandleAsync(new GetTasksQuery(ownerUserId), cancellationToken);
            var response = tasks.Select(TaskTrackerMappings.ToDto);

            return Results.Ok(new
            {
                module = "TaskTracker",
                ownerUserId,
                items = response
            });
        });

        privateGroup.MapGet("/{ownerUserId}/{taskId:guid}", async (HttpContext context, string ownerUserId, Guid taskId, GetTaskByIdQueryHandler queryHandler, CancellationToken cancellationToken) =>
        {
            if (!HasOwnerAccess(context, ownerUserId))
            {
                return Results.Forbid();
            }

            var task = await queryHandler.HandleAsync(new GetTaskByIdQuery(ownerUserId, taskId), cancellationToken);
            if (task is null)
            {
                return Results.NotFound();
            }

            return Results.Ok(TaskTrackerMappings.ToDto(task));
        });

        privateGroup.MapPost("/{ownerUserId}", async (HttpContext context, string ownerUserId, CreateTaskRequest request, CreateTaskCommandHandler commandHandler, CancellationToken cancellationToken) =>
        {
            ValidateDto(request);

            if (!HasOwnerAccess(context, ownerUserId))
            {
                return Results.Forbid();
            }

            var command = TaskTrackerMappings.ToCreateCommand(request, ownerUserId);
            var created = await commandHandler.HandleAsync(command, cancellationToken);
            var dto = TaskTrackerMappings.ToDto(created);

            return Results.Created($"/api/app/tasks/{ownerUserId}/{dto.Id}", dto);
        });

        privateGroup.MapPatch("/{ownerUserId}/{taskId:guid}/complete", async (HttpContext context, string ownerUserId, Guid taskId, CompleteTaskCommandHandler commandHandler, CancellationToken cancellationToken) =>
        {
            if (!HasOwnerAccess(context, ownerUserId))
            {
                return Results.Forbid();
            }

            var command = TaskTrackerMappings.ToCompleteCommand(taskId, ownerUserId);
            var completed = await commandHandler.HandleAsync(command, cancellationToken);
            if (completed is null)
            {
                return Results.NotFound();
            }

            return Results.Ok(new
            {
                item = TaskTrackerMappings.ToDto(completed)
            });
        });
    }

    private static bool HasOwnerAccess(HttpContext context, string ownerUserId)
    {
        return OwnershipGuard.IsOwnerOrAdmin(context.User, ownerUserId);
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

        var errors = results
            .Select(r => r.ErrorMessage ?? "Validation error")
            .ToArray();

        throw new ValidationException(string.Join("; ", errors));
    }
}
