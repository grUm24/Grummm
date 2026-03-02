using System.Reflection;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Platform.Core.Contracts.Modules;

namespace Platform.WebAPI.Extensions;

public static class ModuleRegistrationExtensions
{
    public static IServiceCollection AddPlatformModules(this IServiceCollection services)
    {
        var moduleAssemblies = ResolveModuleAssemblies();
        return services.AddModules(moduleAssemblies.ToArray());
    }

    public static IServiceCollection AddModules(this IServiceCollection services, params Assembly[] assemblies)
    {
        var scanAssemblies = (assemblies is { Length: > 0 } ? assemblies : AppDomain.CurrentDomain.GetAssemblies())
            .Where(a => !a.IsDynamic)
            .Distinct()
            .ToArray();

        var moduleTypes = scanAssemblies
            .SelectMany(GetLoadableTypes)
            .Where(t => t is { IsClass: true, IsAbstract: false } && typeof(IModule).IsAssignableFrom(t))
            .Distinct()
            .ToArray();

        foreach (var moduleType in moduleTypes)
        {
            if (Activator.CreateInstance(moduleType) is not IModule module)
            {
                throw new InvalidOperationException(
                    $"Failed to create module instance for type '{moduleType.FullName}'. " +
                    "Module must have a public parameterless constructor.");
            }

            module.RegisterServices(services);
            services.AddSingleton(typeof(IModule), module);
        }

        return services;
    }

    public static IEndpointRouteBuilder MapModules(this IEndpointRouteBuilder app)
    {
        var modules = app.ServiceProvider.GetServices<IModule>();
        foreach (var module in modules)
        {
            module.MapEndpoints(app);
        }

        return app;
    }

    private static IEnumerable<Type> GetLoadableTypes(Assembly assembly)
    {
        try
        {
            return assembly.GetTypes();
        }
        catch (ReflectionTypeLoadException ex)
        {
            return ex.Types.Where(t => t is not null)!;
        }
    }

    private static IEnumerable<Assembly> ResolveModuleAssemblies()
    {
        var loadedByName = AppDomain.CurrentDomain.GetAssemblies()
            .Where(a => !a.IsDynamic)
            .ToDictionary(a => a.GetName().Name ?? string.Empty, StringComparer.OrdinalIgnoreCase);

        var moduleNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var assembly in loadedByName.Values)
        {
            var assemblyName = assembly.GetName().Name;
            if (IsPlatformModuleAssemblyName(assemblyName))
            {
                moduleNames.Add(assemblyName!);
            }
        }

        var entryAssembly = Assembly.GetEntryAssembly();
        if (entryAssembly is not null)
        {
            foreach (var reference in entryAssembly.GetReferencedAssemblies())
            {
                if (IsPlatformModuleAssemblyName(reference.Name))
                {
                    moduleNames.Add(reference.Name!);
                }
            }
        }

        var baseDirectory = AppContext.BaseDirectory;
        if (Directory.Exists(baseDirectory))
        {
            foreach (var filePath in Directory.EnumerateFiles(baseDirectory, "Platform.Modules.*.dll", SearchOption.TopDirectoryOnly))
            {
                var moduleName = Path.GetFileNameWithoutExtension(filePath);
                if (IsPlatformModuleAssemblyName(moduleName))
                {
                    moduleNames.Add(moduleName);
                }
            }
        }

        foreach (var moduleName in moduleNames)
        {
            if (loadedByName.TryGetValue(moduleName, out var assembly))
            {
                yield return assembly;
                continue;
            }

            Assembly? loadedAssembly = null;
            try
            {
                loadedAssembly = Assembly.Load(new AssemblyName(moduleName));
            }
            catch
            {
                // Module assembly cannot be loaded into current runtime context.
                // Skip it and continue scanning other modules.
            }

            if (loadedAssembly is not null && !loadedAssembly.IsDynamic)
            {
                yield return loadedAssembly;
            }
        }
    }

    private static bool IsPlatformModuleAssemblyName(string? name)
    {
        return !string.IsNullOrWhiteSpace(name)
               && name.StartsWith("Platform.Modules.", StringComparison.OrdinalIgnoreCase);
    }
}
