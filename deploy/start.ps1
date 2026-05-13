# Doctor Directory App - Start Server
param(
    [int]$Port = 3001
)

$env:PORT = $Port
Write-Host "Starting Doctor Directory server on port $Port..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

Set-Location $PSScriptRoot\..
npx tsx server/index.ts
