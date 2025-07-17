# PowerShell script to copy Tauri executables to windows-executable directory

Write-Host "Copying Tauri executables..." -ForegroundColor Green

# Create windows-executable directory if it doesn't exist
if (!(Test-Path "../windows-executable")) {
    New-Item -ItemType Directory -Path "../windows-executable" -Force | Out-Null
    Write-Host "✅ Created windows-executable directory" -ForegroundColor Green
}

# Copy NSIS installer
$nsisPath = "src-tauri/target/release/bundle/nsis/*.exe"
if (Test-Path $nsisPath) {
    $nsisFiles = Get-ChildItem $nsisPath
    foreach ($file in $nsisFiles) {
        Copy-Item $file.FullName "../windows-executable/CMS-F4C-Generator-Windows-Installer.exe" -Force
        Write-Host "✅ NSIS installer copied: $($file.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  No NSIS installer found" -ForegroundColor Yellow
}

# Copy MSI installer
$msiPath = "src-tauri/target/release/bundle/msi/*.msi"
if (Test-Path $msiPath) {
    $msiFiles = Get-ChildItem $msiPath
    foreach ($file in $msiFiles) {
        Copy-Item $file.FullName "../windows-executable/CMS-F4C-Generator-Windows.msi" -Force
        Write-Host "✅ MSI installer copied: $($file.Name)" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  No MSI installer found" -ForegroundColor Yellow
}

Write-Host "✅ Executable copy process completed!" -ForegroundColor Green
