# PowerShell script to build all versions (installer, MSI, and portable)

Write-Host "🚀 Building CMS F4C Generator - All Versions" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "src-tauri/Cargo.toml")) {
    Write-Host "❌ Error: This script must be run from the parser-optimizer directory" -ForegroundColor Red
    exit 1
}

# Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path "src-tauri/target/release") {
    Remove-Item "src-tauri/target/release" -Recurse -Force
    Write-Host "✅ Previous builds cleaned" -ForegroundColor Green
}

# Build web assets first
Write-Host "📦 Building web assets..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Web build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Web assets built successfully" -ForegroundColor Green

# Build all Tauri targets
Write-Host "🔨 Building Tauri application..." -ForegroundColor Yellow
tauri build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tauri build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Tauri application built successfully" -ForegroundColor Green

# Copy executables
Write-Host "📋 Copying executables..." -ForegroundColor Yellow
powershell -ExecutionPolicy Bypass -File copy-executables.ps1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to copy executables" -ForegroundColor Red
    exit 1
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 Build completed successfully!" -ForegroundColor Green
Write-Host "📁 All executables are available in: ../windows-executable/" -ForegroundColor Cyan
Write-Host "   • CMS-F4C-Generator-Windows-Installer.exe (NSIS installer)" -ForegroundColor White
Write-Host "   • CMS-F4C-Generator-Windows.msi (MSI installer)" -ForegroundColor White
Write-Host "   • CMS-F4C-Generator-Portable.exe (Portable version)" -ForegroundColor White
