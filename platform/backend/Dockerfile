FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
ARG ENABLE_RUNTIME_TEMPLATES=false
ENV DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    NUGET_XMLDOC_MODE=skip

COPY Grummm.sln ./
COPY platform/backend/src/Core/Core.csproj platform/backend/src/Core/
COPY platform/backend/src/Infrastructure/Infrastructure.csproj platform/backend/src/Infrastructure/
COPY platform/backend/src/WebAPI/WebAPI.csproj platform/backend/src/WebAPI/
COPY platform/backend/src/Modules/Analytics/Analytics.Module.csproj platform/backend/src/Modules/Analytics/
COPY platform/backend/src/Modules/PlatformOps/PlatformOps.Module.csproj platform/backend/src/Modules/PlatformOps/
COPY platform/backend/src/Modules/ProjectPosts/ProjectPosts.Module.csproj platform/backend/src/Modules/ProjectPosts/
COPY platform/backend/src/Modules/TaskTracker/TaskTracker.Module.csproj platform/backend/src/Modules/TaskTracker/
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet restore platform/backend/src/WebAPI/WebAPI.csproj /p:EnableRuntimeTemplates=${ENABLE_RUNTIME_TEMPLATES}

COPY platform/backend/src/ platform/backend/src/
RUN --mount=type=cache,target=/root/.nuget/packages \
    dotnet publish platform/backend/src/WebAPI/WebAPI.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false /p:EnableRuntimeTemplates=${ENABLE_RUNTIME_TEMPLATES}

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip libpython3.11 postgresql-client \
    && rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "WebAPI.dll"]
