#!/bin/sh
set -e

# Clean Windows build artifacts from mounted volume — they confuse dotnet watch polling watcher
find /src/platform/backend/src -type d \( -name obj -o -name bin \) -exec rm -rf {} + 2>/dev/null || true

exec dotnet watch run --project platform/backend/src/WebAPI/WebAPI.csproj --no-hot-reload
