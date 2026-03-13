# Environment Notes

## Current Development Environment

- **OS**: Windows 10/11
- **Shell**: PowerShell
- **Location**: `C:\Users\Я комп\Documents\Projects\Nails-studio`
- **Project Name**: Grummm Platform (����� ���������� Nails-studio � ��� ��������������!)

## Available Tools

| Tool | Status | Notes |
|------|--------|-------|
| Node.js | ✅ Available | Use `npm` commands |
| npm | ✅ Available | Package manager |
| bun | ❌ Not installed | Use `npm` instead |
| dotnet | ❓ Unknown | Required for backend |
| Docker | ❓ Unknown | Required for full stack |

## Windows-Specific Notes

1. **PowerShell syntax**: Use PowerShell commands, not bash
2. **No `tee` command**: Use `| Out-File log.txt` or `| Tee-Object -FilePath log.txt`
3. **Path separators**: Use `\` or `/` (both work in PowerShell)
4. **Process management**: Use `Get-Process`, `Stop-Process` for port conflicts

## Common Commands (Windows)

### Check what's using a port
```powershell
netstat -ano | findstr :3000
```

### Kill process by PID
```powershell
taskkill /PID <pid> /F
```

### Run frontend dev server
```powershell
npm run dev --workspace @platform/frontend
```

### Run backend (if dotnet available)
```powershell
dotnet build platform/backend/src/WebAPI/WebAPI.csproj --configuration Release
```

## Known Issues

1. **Port 3000 conflict**: May be occupied by another process
2. **`tee` in scripts**: Some npm scripts use `tee` which doesn't exist on Windows
3. **Bun not installed**: Project README mentions `bun` but it's not available

## Project Structure Quick Reference

```
Nails-studio/                 <- ����� (�������� �� ������������� �������!)
├── platform/
│   ├── backend/              <- ASP.NET Core 9 backend
│   │   └── src/
│   │       ├── WebAPI/       <- Entry point
│   │       ├── Core/         <- Domain abstractions
│   │       ├── Infrastructure/
│   │       └── Modules/      <- Business modules
│   ├── frontend/             <- React + Vite frontend
│   │   └── src/
│   │       ├── core/         <- Auth, layouts, routing
│   │       ├── modules/      <- Feature modules
│   │       └── public/       <- Public pages
│   └── infra/                <- Docker, nginx, scripts
├── docs/                     <- Documentation
├── ai-context.md             <- Current state snapshot
├── architecture-lock.md      <- Locked constraints
├── module-contract.md        <- Module boundaries
└── llm-rules.md              <- Hard rules
```

## Route Zones (Locked)

| Zone | Routes | Access |
|------|--------|--------|
| Public Web | `/`, `/projects`, `/projects/:id` | Anyone |
| Private Web | `/app/*` | Admin only |
| Public API | `/api/public/*` | Anyone |
| Private API | `/api/app/*` | Admin only |

## Last Updated

2026-03-05
