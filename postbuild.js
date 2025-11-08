const fs = require('fs');
const path = require('path');

console.log('🔧 Post-build: Copiando archivos al directorio dist...\n');

const distDir = path.join(__dirname, 'dist');
const publicDir = path.join(__dirname, 'public');

// Archivos a copiar
const filesToCopy = [
  'manifest.json',
  'browserconfig.xml',
  'robots.txt',
  'favicon.ico',
  'adaptive-icon.png',
  'splash-icon.png',
  'icon-72x72.png',
  'icon-96x96.png',
  'icon-128x128.png',
  'icon-144x144.png',
  'icon-152x152.png',
  'icon-192x192.png',
  'icon-384x384.png',
  'icon-512x512.png'
];

let copiedCount = 0;

filesToCopy.forEach(file => {
  const sourcePath = path.join(publicDir, file);
  const destPath = path.join(distDir, file);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✓ Copiado: ${file}`);
    copiedCount++;
  } else {
    console.log(`⚠ No encontrado: ${file}`);
  }
});

// Crear archivo _redirects
const redirectsPath = path.join(distDir, '_redirects');
fs.writeFileSync(redirectsPath, '/*    /index.html   200\n');
console.log('✓ Creado: _redirects');

// Actualizar index.html con PWA meta tags
const indexPath = path.join(distDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Solo agregar si no están ya presentes
  if (!html.includes('manifest.json')) {
    const pwaTags = `
    <!-- PWA Configuration -->
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#0066cc">
    
    <!-- Apple Touch Icons -->
    <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png">
    <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png">
    <link rel="apple-touch-icon" sizes="144x144" href="/icon-144x144.png">
    
    <!-- Favicons -->
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico">
    <link rel="shortcut icon" href="/favicon.ico">
    
    <!-- iOS Meta Tags -->
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="CJ Insight">
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="Aplicación de supervisión para técnicos de campo y gestión de cuadrillas">
    <meta name="author" content="CJ Insight">
    `;
    
    // Cambiar idioma
    html = html.replace('<html lang="en">', '<html lang="es">');
    
    // Cambiar título
    html = html.replace(
      /<title>.*?<\/title>/,
      '<title>CJ Insight - Field Tech Supervisor</title>'
    );
    
    // Insertar PWA tags después del viewport
    html = html.replace(
      /(<meta name="viewport"[^>]*>)/,
      `$1${pwaTags}`
    );
    
    fs.writeFileSync(indexPath, html);
    console.log('✓ Actualizado: index.html con PWA tags');
  } else {
    console.log('✓ index.html ya tiene PWA tags');
  }
}

console.log(`\n✅ Post-build completado! ${copiedCount + 2} archivos procesados.\n`);
