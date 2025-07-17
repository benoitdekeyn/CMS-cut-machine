@echo off
echo 🚀 Building CMS F4C Generator - All Versions
echo =============================================

:: Check if we're in the right directory
if not exist "src-tauri\Cargo.toml" (
    echo ❌ Error: This script must be run from the parser-optimizer directory
    pause
    exit /b 1
)

:: Clean previous builds
echo 🧹 Cleaning previous builds...
if exist "src-tauri\target\release" (
    rmdir /s /q "src-tauri\target\release"
    echo ✅ Previous builds cleaned
)

:: Build web assets first
echo 📦 Building web assets...
call npm run build
if errorlevel 1 (
    echo ❌ Web build failed
    pause
    exit /b 1
)
echo ✅ Web assets built successfully

:: Build all Tauri targets
echo 🔨 Building Tauri application...
call tauri build
if errorlevel 1 (
    echo ❌ Tauri build failed
    pause
    exit /b 1
)
echo ✅ Tauri application built successfully

:: Copy executables
echo 📋 Copying executables...
powershell -ExecutionPolicy Bypass -File copy-executables.ps1
if errorlevel 1 (
    echo ❌ Failed to copy executables
    pause
    exit /b 1
)

echo.
echo 🎉 Build completed successfully!
echo 📁 All executables are available in: ..\windows-executable\
echo    • CMS-F4C-Generator-Windows-Installer.exe (NSIS installer)
echo    • CMS-F4C-Generator-Windows.msi (MSI installer)
echo    • CMS-F4C-Generator-Portable.exe (Portable version)
echo.
pause
