using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Platform.Modules.ProjectPosts.Domain.Entities;

namespace Platform.Modules.ProjectPosts.Application.Commands;

public static class UploadWithTemplateCommandValidator
{
    public static void Validate(UploadWithTemplateCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.Id))
        {
            throw new ValidationException("Project id is required.");
        }

        if (!Enum.IsDefined(command.TemplateType) || command.TemplateType == TemplateType.None)
        {
            throw new ValidationException("TemplateType must be one of: Static, CSharp, Python, JavaScript.");
        }

        switch (command.TemplateType)
        {
            case TemplateType.Static:
                if (!HasFile(command.FrontendFiles, "index.html") && !HasArchive(command.FrontendFiles))
                {
                    throw new ValidationException("Static template requires frontend index.html or a .zip archive with index.html.");
                }
                RequireNoFiles(command.BackendFiles, "Static template does not accept backend files.");
                break;
            case TemplateType.CSharp:
                RequireFileByExtension(command.BackendFiles, ".dll", "CSharp template requires at least one .dll file.");
                RequireFileByExtension(command.BackendFiles, ".deps.json", "CSharp template requires at least one .deps.json file.");
                break;
            case TemplateType.Python:
                RequireFile(command.BackendFiles, "requirements.txt", "Python template requires requirements.txt.");
                RequireFileByExtension(command.BackendFiles, ".py", "Python template requires at least one .py file.");
                break;
            case TemplateType.JavaScript:
                RequireFile(command.BackendFiles, "package.json", "JavaScript template requires package.json.");
                RejectExtension(command.BackendFiles.Concat(command.FrontendFiles), ".exe", "JavaScript template cannot include executable files (.exe).");
                break;
        }
    }

    private static void RequireFile(IEnumerable<IFormFile> files, string expectedName, string message)
    {
        var found = HasFile(files, expectedName);
        if (!found)
        {
            throw new ValidationException(message);
        }
    }

    private static bool HasFile(IEnumerable<IFormFile> files, string expectedName)
    {
        return files.Any(f => string.Equals(Path.GetFileName(f.FileName), expectedName, StringComparison.OrdinalIgnoreCase));
    }

    private static bool HasArchive(IEnumerable<IFormFile> files)
    {
        return files.Any(f => Path.GetFileName(f.FileName).EndsWith(".zip", StringComparison.OrdinalIgnoreCase));
    }

    private static void RequireFileByExtension(IEnumerable<IFormFile> files, string extension, string message)
    {
        var found = files.Any(f =>
        {
            var fileName = Path.GetFileName(f.FileName);
            return fileName.EndsWith(extension, StringComparison.OrdinalIgnoreCase);
        });

        if (!found)
        {
            throw new ValidationException(message);
        }
    }

    private static void RejectExtension(IEnumerable<IFormFile> files, string extension, string message)
    {
        var foundForbidden = files.Any(f =>
        {
            var fileName = Path.GetFileName(f.FileName);
            return fileName.EndsWith(extension, StringComparison.OrdinalIgnoreCase);
        });

        if (foundForbidden)
        {
            throw new ValidationException(message);
        }
    }

    private static void RequireNoFiles(IEnumerable<IFormFile> files, string message)
    {
        if (files.Any())
        {
            throw new ValidationException(message);
        }
    }
}
