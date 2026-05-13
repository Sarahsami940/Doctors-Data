# ============================================
# Doctor Directory App - Quick Setup Script
# Run this once on the VM after copying the folder
# ============================================

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Doctor Directory - Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js $nodeVersion found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org" -ForegroundColor Yellow
    exit 1
}

# Dependencies already included
Write-Host "[OK] Dependencies already included (node_modules)" -ForegroundColor Green

# Seed database from Excel files
Write-Host ""
Write-Host "Seeding database from Excel files..." -ForegroundColor Yellow
npm run seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to seed database" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Database seeded successfully (33,000+ doctors)" -ForegroundColor Green

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To start the server, run:" -ForegroundColor White
Write-Host "  .\start.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or with a custom port:" -ForegroundColor White
Write-Host "  .\start.ps1 -Port 8080" -ForegroundColor Yellow
Write-Host ""
