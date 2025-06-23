const fs = require('fs');
const path = require('path');
const { minify } = require('terser');

async function createOptimizedBundle() {
  // Read files
  const htmlPath = path.join(__dirname, '../dist/index.html');
  const jsPath = path.join(__dirname, '../dist/bundle.js');
  const cssPath = path.join(__dirname, '../dist/main.css');
  
  // Check if all required files exist
  if (!fs.existsSync(htmlPath) || !fs.existsSync(jsPath) || !fs.existsSync(cssPath)) {
    console.error('Required build files are missing. Make sure webpack build was successful.');
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  
  // Create output directory
  const outputDir = path.join(__dirname, '../executable');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Create assets directory in executable
  const assetsDir = path.join(outputDir, 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Copy assets from dist to executable
  const distAssetsDir = path.join(__dirname, '../dist/assets');
  if (fs.existsSync(distAssetsDir)) {
    const assets = fs.readdirSync(distAssetsDir);
    assets.forEach(asset => {
      const srcPath = path.join(distAssetsDir, asset);
      const destPath = path.join(assetsDir, asset);
      fs.copyFileSync(srcPath, destPath);
    });
  }
  
  // Minify JS further
  const minified = await minify(js, {
    compress: {
      ecma: 2015,
      passes: 3,
      drop_console: true
    },
    mangle: true
  });
  
  // Inline assets as data URLs
  function inlineAssets(htmlContent) {
    return htmlContent.replace(/href="assets\/([^"]+)"|src="assets\/([^"]+)"/g, (match, hrefAsset, srcAsset) => {
      const assetName = hrefAsset || srcAsset;
      const assetPath = path.join(__dirname, '../dist/assets', assetName);
      
      if (fs.existsSync(assetPath)) {
        const ext = path.extname(assetName).toLowerCase();
        const mimeTypes = {
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon'
        };
        const mimeType = mimeTypes[ext] || 'application/octet-stream';
        
        const data = fs.readFileSync(assetPath);
        const base64 = data.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;
        
        return match.includes('href=') ? 
          `href="${dataUrl}"` : 
          `src="${dataUrl}"`;
      }
      
      console.warn(`Asset not found: ${assetName}`);
      return match;
    });
  }
  
  // Create the inlined HTML with properly positioned CSS and JS
  let inlinedHTML = html;
  
  // Replace or add the style in head
  if (inlinedHTML.includes('</head>')) {
    inlinedHTML = inlinedHTML.replace('</head>', `<style>${css}</style></head>`);
  } else {
    inlinedHTML = `<style>${css}</style>${inlinedHTML}`;
  }
  
  // Replace the script tag with inline content
  if (inlinedHTML.includes('<script src="bundle.js"></script>') || 
      inlinedHTML.includes('<script defer="defer" src="bundle.js"></script>')) {
    inlinedHTML = inlinedHTML
      .replace(/<script[^>]*src="bundle\.js"[^>]*><\/script>/, 
               `<script>${minified.code}</script>`);
  } else {
    // If no script tag is found, add it before the closing body tag
    inlinedHTML = inlinedHTML.replace('</body>', `<script>${minified.code}</script></body>`);
  }
  
  // Inline any referenced assets (including the favicon)
  inlinedHTML = inlineAssets(inlinedHTML);

  // Write the output
  const outputPath = path.join(outputDir, 'index.html');
  fs.writeFileSync(outputPath, inlinedHTML);
  
  // Report sizes
  const originalSize = (
    fs.statSync(htmlPath).size + 
    fs.statSync(jsPath).size + 
    fs.statSync(cssPath).size
  ) / 1024; // KB
  
  const newSize = fs.statSync(outputPath).size / 1024;
  
  console.log('----- Build Complete -----');
  console.log(`Original files (total): ${originalSize.toFixed(2)} KB`);
  console.log(`Optimized single file: ${newSize.toFixed(2)} KB`);
  console.log(`Reduction: ${((1 - newSize/originalSize) * 100).toFixed(2)}%`);
  console.log(`Output: ${outputPath}`);
}

createOptimizedBundle().catch(err => {
  console.error('Error during bundle optimization:', err);
  process.exit(1);
});