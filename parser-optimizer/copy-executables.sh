#!/bin/bash
# Script to copy Tauri executables to windows-executable directory

echo "Copying Tauri executables..."

# Create windows-executable directory if it doesn't exist
if [ ! -d "../windows-executable" ]; then
    mkdir -p "../windows-executable"
fi

# Copy NSIS installer
if [ -f "src-tauri/target/release/bundle/nsis/"*.exe ]; then
    cp src-tauri/target/release/bundle/nsis/*.exe "../windows-executable/CMS-F4C-Generator-Windows-Installer.exe"
    echo "✅ NSIS installer copied"
fi

# Copy MSI installer
if [ -f "src-tauri/target/release/bundle/msi/"*.msi ]; then
    cp src-tauri/target/release/bundle/msi/*.msi "../windows-executable/CMS-F4C-Generator-Windows.msi"
    echo "✅ MSI installer copied"
fi

# Copy portable executable
if [ -f "src-tauri/target/release/cms-f4c-generator.exe" ]; then
    cp src-tauri/target/release/cms-f4c-generator.exe "../windows-executable/CMS-F4C-Generator-Portable.exe"
    echo "✅ Portable executable copied"
fi

echo "✅ All executables copied to windows-executable directory!"
