# ============================================
# Doctor Directory App - Start Server
# ============================================

param(
    [int]$Port = 3001
)

$env:PORT = $Port

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Doctor Directory Server" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  URL: http://localhost:$Port" -ForegroundColor Green
Write-Host "  API: http://localhost:$Port/api" -ForegroundColor Green
Write-Host ""
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

npm run start
