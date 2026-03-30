#!/usr/bin/env bash
set -euo pipefail

# Start the development environment
# Backend: .NET SDK with dotnet watch (hot reload)
# Frontend: Vite dev server with HMR
# Database: PostgreSQL (platform_dev)
# Access: http://localhost:5173

docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build "$@"
