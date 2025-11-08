const fs = require('fs');
const path = require('path');

// Verificar si el directorio public existe
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copiar el icono principal a public con diferentes nombres
const sourceIcon = path.join(__dirname, 'assets', 'images', 'icon.png');
const targetDir = path.join(__dirname, 'public');

const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

if (fs.existsSync(sourceIcon)) {
  console.log('✅ Copiando iconos al directorio public...\n');
  
  iconSizes.forEach(size => {
    const targetPath = path.join(targetDir, `icon-${size}x${size}.png`);
    fs.copyFileSync(sourceIcon, targetPath);
    console.log(`✓ Creado: icon-${size}x${size}.png`);
  });
  
  // Copiar favicon
  const faviconSource = path.join(__dirname, 'assets', 'images', 'favicon.png');
  if (fs.existsSync(faviconSource)) {
    fs.copyFileSync(faviconSource, path.join(targetDir, 'favicon.ico'));
    console.log('✓ Creado: favicon.ico');
  }
  
  // Copiar el splash icon
  const splashSource = path.join(__dirname, 'assets', 'images', 'splash-icon.png');
  if (fs.existsSync(splashSource)) {
    fs.copyFileSync(splashSource, path.join(targetDir, 'splash-icon.png'));
    console.log('✓ Creado: splash-icon.png');
  }
  
  // Copiar adaptive icon
  const adaptiveSource = path.join(__dirname, 'assets', 'images', 'adaptive-icon.png');
  if (fs.existsSync(adaptiveSource)) {
    fs.copyFileSync(adaptiveSource, path.join(targetDir, 'adaptive-icon.png'));
    console.log('✓ Creado: adaptive-icon.png');
  }
  
  console.log('\n✅ Todos los iconos han sido copiados exitosamente!');
  console.log('\n📝 Nota: Para iconos optimizados en diferentes tamaños,');
  console.log('   considera usar una herramienta como sharp o imagemagick.');
  console.log('   Por ahora, todos los iconos usan la misma imagen base.\n');
} else {
  console.error('❌ Error: No se encontró el archivo icon.png en assets/images/');
  process.exit(1);
}
