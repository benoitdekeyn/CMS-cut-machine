const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const webFilesDir = path.resolve(repoRoot, '..', 'web-files');
const distDir = path.join(webFilesDir, 'dist');

function moveContents(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
      moveContents(srcPath, destPath);
      fs.rmdirSync(srcPath);
    } else {
      // If destination file exists, overwrite it
      try { fs.renameSync(srcPath, destPath); } catch (err) {
        // fallback to copy and unlink
        fs.copyFileSync(srcPath, destPath);
        fs.unlinkSync(srcPath);
      }
    }
  }
}

try {
  if (!fs.existsSync(distDir)) {
    // nothing to do
    process.exit(0);
  }
  moveContents(distDir, webFilesDir);
  // remove dist directory if empty
  if (fs.existsSync(distDir)) {
    try { fs.rmdirSync(distDir, { recursive: true }); } catch (e) { /* ignore */ }
  }
  process.exit(0);
} catch (err) {
  console.error('Failed to move web-files contents:', err);
  process.exit(1);
}
