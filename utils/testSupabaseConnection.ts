import { supabase } from "./supabase";

export async function testSupabaseConnection() {
  console.log("\n=== 🔍 DIAGNÓSTICO DE CONEXIÓN SUPABASE ===\n");

  try {
    console.log("1️⃣ Testing connection to Supabase...");
    const { data: testData, error: testError } = await supabase
      .from("cuadrillas")
      .select("id, nombre")
      .limit(1);

    if (testError) {
      console.error("❌ ERROR DE CONEXIÓN:");
      console.error("  Message:", testError.message);
      console.error("  Code:", testError.code);
      console.error("  Details:", testError.details);
      console.error("  Hint:", testError.hint);
      return false;
    }

    console.log("✅ Conexión exitosa a Supabase");
    console.log("  Datos de prueba:", testData);

    console.log("\n2️⃣ Testing UPDATE permission...");
    if (testData && testData.length > 0) {
      const testId = testData[0].id;
      const { data: updateData, error: updateError } = await supabase
        .from("cuadrillas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", testId)
        .select();

      if (updateError) {
        console.error("❌ ERROR AL HACER UPDATE:");
        console.error("  Message:", updateError.message);
        console.error("  Code:", updateError.code);
        console.error("  Details:", updateError.details);
        console.error("  Hint:", updateError.hint);
        return false;
      }

      console.log("✅ Permiso de UPDATE confirmado");
      console.log("  Datos actualizados:", updateData);
    }

    console.log("\n=== ✅ TODOS LOS TESTS PASARON ===\n");
    return true;
  } catch (error: any) {
    console.error("\n❌ ERROR INESPERADO:");
    console.error("  Type:", typeof error);
    console.error("  Message:", error?.message || "Sin mensaje");
    console.error("  Stack:", error?.stack || "Sin stack trace");
    console.error("\n");
    return false;
  }
}
