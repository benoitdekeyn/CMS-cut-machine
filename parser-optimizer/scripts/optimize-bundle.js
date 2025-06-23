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
  const outputDir = path.join(__dirname, '../../executable');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
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