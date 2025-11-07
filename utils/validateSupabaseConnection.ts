import { supabase } from "@/utils/supabase";
import { errorToString } from "@/utils/formatSupabaseError";

export async function validateSupabaseConnection() {
  console.log("\n╔═══════════════════════════════════════════════════════════");
  console.log("║ 🔍 VALIDACIÓN DE CONEXIÓN A SUPABASE");
  console.log("╚═══════════════════════════════════════════════════════════\n");

  const results: Record<string, { ok: boolean; count?: number; error?: any; details?: any }> = {};

  const url = (supabase as any).supabaseUrl ?? "";
  const ref = url.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1];
  
  console.log("📍 Configuración:");
  console.log(`   URL: ${url}`);
  console.log(`   REF: ${ref}`);
  console.log(`   Esperado: lgizmslffyaeeyogcdmm`);
  
  if (ref !== "lgizmslffyaeeyogcdmm") {
    console.log("\n⚠️  ADVERTENCIA: No estás usando la base de datos correcta!\n");
  } else {
    console.log("   ✅ URL correcta\n");
  }

  // 1. Verificar tabla USUARIO
  console.log("🔹 Verificando tabla USUARIO...");
  try {
    const { data, count, error } = await supabase
      .from("usuario")
      .select("id_usuario, nombre_usuario, clave_usuario, tipo_usuario, id, id_empleado", { count: "exact" })
      .limit(3);

    if (error) {
      const errorStr = errorToString(error);
      console.error("   ❌ Error accediendo a tabla USUARIO:", errorStr);
      results["usuario"] = { ok: false, error: errorStr };
    } else {
      console.log(`   ✅ Tabla USUARIO accesible (${count} registros)`);
      console.log("   📋 Campos verificados: id_usuario, nombre_usuario, clave_usuario, tipo_usuario, id, id_empleado");
      console.log("   📄 Muestra de datos:", data);
      results["usuario"] = { ok: true, count: count ?? 0, details: data };
    }
  } catch (err: any) {
    console.error("   ❌ Excepción:", err.message);
    results["usuario"] = { ok: false, error: err.message };
  }

  // 2. Verificar tabla CUADRILLAS
  console.log("\n🔹 Verificando tabla CUADRILLAS...");
  try {
    const { data, count, error } = await supabase
      .from("cuadrillas")
      .select("id, nombre, latitud, longitud, zona, categoria", { count: "exact" })
      .limit(3);

    if (error) {
      const errorStr = errorToString(error);
      console.error("   ❌ Error accediendo a tabla CUADRILLAS:", errorStr);
      results["cuadrillas"] = { ok: false, error: errorStr };
    } else {
      console.log(`   ✅ Tabla CUADRILLAS accesible (${count} registros)`);
      console.log("   📋 Campos verificados: id, nombre, latitud, longitud, zona, categoria");
      console.log("   📄 Muestra de datos:", data);
      results["cuadrillas"] = { ok: true, count: count ?? 0, details: data };
    }
  } catch (err: any) {
    console.error("   ❌ Excepción:", err.message);
    results["cuadrillas"] = { ok: false, error: err.message };
  }

  // 3. Verificar tabla SITES_V1
  console.log("\n🔹 Verificando tabla SITES_V1...");
  try {
    const { count, error } = await supabase
      .from("sites_v1")
      .select("id", { head: true, count: "exact" });

    if (error) {
      const errorStr = errorToString(error);
      console.error("   ❌ Error accediendo a tabla SITES_V1:", errorStr);
      results["sites_v1"] = { ok: false, error: errorStr };
    } else {
      console.log(`   ✅ Tabla SITES_V1 accesible (${count} registros)`);
      results["sites_v1"] = { ok: true, count: count ?? 0 };
    }
  } catch (err: any) {
    console.error("   ❌ Excepción:", err.message);
    results["sites_v1"] = { ok: false, error: err.message };
  }

  // 4. Verificar tabla TICKETS_V1
  console.log("\n🔹 Verificando tabla TICKETS_V1...");
  try {
    const { count, error } = await supabase
      .from("tickets_v1")
      .select("id", { head: true, count: "exact" });

    if (error) {
      const errorStr = errorToString(error);
      console.error("   ❌ Error accediendo a tabla TICKETS_V1:", errorStr);
      results["tickets_v1"] = { ok: false, error: errorStr };
    } else {
      console.log(`   ✅ Tabla TICKETS_V1 accesible (${count} registros)`);
      results["tickets_v1"] = { ok: true, count: count ?? 0 };
    }
  } catch (err: any) {
    console.error("   ❌ Excepción:", err.message);
    results["tickets_v1"] = { ok: false, error: err.message };
  }

  // 5. Verificar relación USUARIO <-> CUADRILLAS (sin FK)
  console.log("\n🔹 Verificando relación USUARIO <-> CUADRILLAS...");
  try {
    // Como no hay FK entre usuario.id y cuadrillas.id, hacemos dos queries separadas
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from("usuario")
      .select("id_usuario, nombre_usuario, id")
      .not("id", "is", null)
      .limit(3);

    if (errorUsuarios) {
      const errorStr = errorToString(errorUsuarios);
      console.error("   ❌ Error leyendo usuarios:", errorStr);
      results["usuario_cuadrillas_relation"] = { ok: false, error: errorStr };
    } else if (usuarios && usuarios.length > 0) {
      // Buscar las cuadrillas correspondientes
      const cuadrillaIds = usuarios.map(u => u.id).filter(Boolean);
      const { data: cuadrillas, error: errorCuadrillas } = await supabase
        .from("cuadrillas")
        .select("id, nombre")
        .in("id", cuadrillaIds);

      if (errorCuadrillas) {
        const errorStr = errorToString(errorCuadrillas);
        console.error("   ❌ Error leyendo cuadrillas:", errorStr);
        results["usuario_cuadrillas_relation"] = { ok: false, error: errorStr };
      } else {
        console.log("   ✅ Relación USUARIO <-> CUADRILLAS funcional (sin FK explícita)");
        console.log("   📄 Usuarios con cuadrilla:", usuarios.length);
        console.log("   📄 Cuadrillas encontradas:", cuadrillas?.length || 0);
        results["usuario_cuadrillas_relation"] = { ok: true, details: { usuarios, cuadrillas } };
      }
    } else {
      console.log("   ⚠️  No hay usuarios con cuadrilla asignada para verificar");
      results["usuario_cuadrillas_relation"] = { ok: true, details: "No users with cuadrilla" };
    }
  } catch (err: any) {
    console.error("   ❌ Excepción:", err.message);
    results["usuario_cuadrillas_relation"] = { ok: false, error: err.message };
  }

  // Resumen final
  console.log("\n╔═══════════════════════════════════════════════════════════");
  console.log("║ 📊 RESUMEN DE VALIDACIÓN");
  console.log("╠═══════════════════════════════════════════════════════════");
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(r => r.ok).length;
  const failedChecks = totalChecks - passedChecks;
  
  Object.entries(results).forEach(([key, result]) => {
    const status = result.ok ? "✅" : "❌";
    const count = result.count !== undefined ? ` (${result.count} registros)` : "";
    console.log(`║ ${status} ${key}${count}`);
  });
  
  console.log("╠═══════════════════════════════════════════════════════════");
  console.log(`║ Total: ${passedChecks}/${totalChecks} verificaciones exitosas`);
  
  if (failedChecks > 0) {
    console.log("║");
    console.log("║ ⚠️  ACCIONES RECOMENDADAS:");
    console.log("║ 1. Ejecutar en Supabase SQL Editor:");
    console.log("║    NOTIFY pgrst, 'reload schema';");
    console.log("║ 2. Esperar 10-20 segundos");
    console.log("║ 3. Verificar RLS (Row Level Security) de las tablas");
    console.log("║ 4. Verificar que los campos existan en las tablas");
  } else {
    console.log("║ ✅ Todas las verificaciones pasaron correctamente");
  }
  
  console.log("╚═══════════════════════════════════════════════════════════\n");

  return results;
}
