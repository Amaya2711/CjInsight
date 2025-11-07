/**
 * Script de validación de la aplicación
 * Verifica la configuración y funcionalidad básica
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔═══════════════════════════════════════════════════════════');
console.log('║ 🔍 VALIDACIÓN DE LA APLICACIÓN');
console.log('╚═══════════════════════════════════════════════════════════\n');

const results = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// 1. Verificar archivo .env
console.log('📋 1. Verificando configuración...\n');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✅ Archivo .env existe');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  
  if (envContent.includes('EXPO_PUBLIC_SUPABASE_URL')) {
    console.log('   ✅ Variable EXPO_PUBLIC_SUPABASE_URL configurada');
    results.passed++;
  } else {
    console.log('   ❌ Variable EXPO_PUBLIC_SUPABASE_URL no encontrada');
    results.failed++;
  }
  
  if (envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')) {
    console.log('   ✅ Variable EXPO_PUBLIC_SUPABASE_ANON_KEY configurada');
    results.passed++;
  } else {
    console.log('   ❌ Variable EXPO_PUBLIC_SUPABASE_ANON_KEY no encontrada');
    results.failed++;
  }
} else {
  console.log('   ❌ Archivo .env no encontrado');
  results.failed++;
}

// 2. Verificar estructura de directorios
console.log('\n📂 2. Verificando estructura de directorios...\n');
const requiredDirs = ['app', 'services', 'utils', 'store', 'types', 'constants'];
requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`   ✅ Directorio /${dir} existe`);
    results.passed++;
  } else {
    console.log(`   ❌ Directorio /${dir} no encontrado`);
    results.failed++;
  }
});

// 3. Verificar servicios principales
console.log('\n🔧 3. Verificando servicios principales...\n');
const requiredServices = [
  'auth.ts',
  'cuadrillas.ts',
  'tickets.ts',
  'backgroundLocation.ts',
  'sync.ts'
];

requiredServices.forEach(service => {
  const servicePath = path.join(__dirname, 'services', service);
  if (fs.existsSync(servicePath)) {
    console.log(`   ✅ Servicio ${service} existe`);
    results.passed++;
  } else {
    console.log(`   ❌ Servicio ${service} no encontrado`);
    results.failed++;
  }
});

// 4. Verificar archivos de configuración
console.log('\n⚙️  4. Verificando archivos de configuración...\n');
const configFiles = ['package.json', 'app.json', 'tsconfig.json'];
configFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file} existe`);
    results.passed++;
  } else {
    console.log(`   ❌ ${file} no encontrado`);
    results.failed++;
  }
});

// 5. Verificar node_modules
console.log('\n📦 5. Verificando dependencias instaladas...\n');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('   ✅ Directorio node_modules existe');
  
  // Verificar algunas dependencias críticas
  const criticalDeps = ['expo', 'react', 'react-native', '@supabase/supabase-js'];
  criticalDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    if (fs.existsSync(depPath)) {
      console.log(`   ✅ Dependencia ${dep} instalada`);
      results.passed++;
    } else {
      console.log(`   ❌ Dependencia ${dep} no encontrada`);
      results.failed++;
    }
  });
} else {
  console.log('   ❌ Directorio node_modules no encontrado');
  console.log('   ℹ️  Ejecuta: npm install --legacy-peer-deps');
  results.failed++;
}

// 6. Verificar pantallas principales
console.log('\n📱 6. Verificando pantallas principales...\n');
const mainScreens = [
  'app/index.tsx',
  'app/login.tsx',
  'app/(tabs)/tickets.tsx',
  'app/(tabs)/cuadrillas.tsx',
  'app/(tabs)/crews-map.tsx'
];

mainScreens.forEach(screen => {
  const screenPath = path.join(__dirname, screen);
  if (fs.existsSync(screenPath)) {
    console.log(`   ✅ Pantalla ${screen} existe`);
    results.passed++;
  } else {
    console.log(`   ⚠️  Pantalla ${screen} no encontrada`);
    results.warnings++;
  }
});

// Resumen final
console.log('\n╔═══════════════════════════════════════════════════════════');
console.log('║ 📊 RESUMEN DE VALIDACIÓN');
console.log('╚═══════════════════════════════════════════════════════════\n');

const total = results.passed + results.failed + results.warnings;
const percentage = total > 0 ? Math.round((results.passed / total) * 100) : 0;

console.log(`   ✅ Pruebas exitosas: ${results.passed}`);
console.log(`   ❌ Pruebas fallidas: ${results.failed}`);
console.log(`   ⚠️  Advertencias: ${results.warnings}`);
console.log(`   📈 Porcentaje de éxito: ${percentage}%\n`);

if (results.failed === 0 && results.warnings === 0) {
  console.log('   🎉 ¡La aplicación está lista para ejecutarse!\n');
  console.log('   💡 Comandos sugeridos:');
  console.log('      - npm start           (Iniciar con Expo)');
  console.log('      - npm run start-web   (Iniciar en navegador)\n');
  process.exit(0);
} else if (results.failed === 0) {
  console.log('   ✓ La aplicación puede ejecutarse con algunas advertencias\n');
  console.log('   💡 Comandos sugeridos:');
  console.log('      - npm start           (Iniciar con Expo)');
  console.log('      - npm run start-web   (Iniciar en navegador)\n');
  process.exit(0);
} else {
  console.log('   ⚠️  Se encontraron problemas que deben resolverse\n');
  console.log('   📝 Acciones recomendadas:');
  if (results.failed > 0) {
    console.log('      1. Revisar los elementos marcados con ❌');
    console.log('      2. Asegurarse de que .env esté configurado');
    console.log('      3. Ejecutar: npm install --legacy-peer-deps\n');
  }
  process.exit(1);
}
