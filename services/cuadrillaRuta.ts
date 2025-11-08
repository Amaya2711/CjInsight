import { supabase } from '@/utils/supabase';
import { formatSupabaseError } from '@/utils/formatSupabaseError';
import { getPeruNow } from '@/utils/timezone';

export type CuadrillaRutaDB = {
  id: number;
  cuadrilla_id: number;
  latitud: number;
  longitud: number;
  timestamp: string;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  created_at: string;
};

export type CuadrillaRutaInsert = {
  cuadrilla_id: number;
  latitud: number;
  longitud: number;
  timestamp?: string;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
};

export async function insertCuadrillaRuta(ruta: CuadrillaRutaInsert): Promise<{ data: CuadrillaRutaDB | null; error: any }> {
  try {
    console.log('[CuadrillaRuta] 📍 Insertando punto de ruta:', {
      cuadrilla_id: ruta.cuadrilla_id,
      latitud: ruta.latitud,
      longitud: ruta.longitud,
    });

    // Si no se proporciona timestamp, usar hora local del dispositivo (Perú UTC-5)
    let timestampToUse = ruta.timestamp;
    if (!timestampToUse) {
      timestampToUse = getPeruNow();
      console.log('[CuadrillaRuta] ⏰ Usando timestamp local (Perú):', timestampToUse);
    }
    
    const { data, error } = await supabase
      .from('cuadrilla_ruta')
      .insert({
        cuadrilla_id: ruta.cuadrilla_id,
        latitud: ruta.latitud,
        longitud: ruta.longitud,
        timestamp: timestampToUse,
        accuracy: ruta.accuracy || null,
        altitude: ruta.altitude || null,
        heading: ruta.heading || null,
        speed: ruta.speed || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[CuadrillaRuta] ❌ Error insertando ruta:', formatSupabaseError(error));
      return { data: null, error };
    }

    console.log('[CuadrillaRuta] ✅ Punto de ruta insertado exitosamente:', data?.id);
    return { data, error: null };
  } catch (err: any) {
    console.error('[CuadrillaRuta] ❌ Excepción insertando ruta:', err);
    return { data: null, error: err };
  }
}

export async function getRutaByCuadrillaId(
  cuadrillaId: number,
  limit: number = 100
): Promise<{ data: CuadrillaRutaDB[] | null; error: any }> {
  try {
    console.log(`[CuadrillaRuta] 📡 Obteniendo ruta de cuadrilla ${cuadrillaId}...`);

    const { data, error } = await supabase
      .from('cuadrilla_ruta')
      .select('*')
      .eq('cuadrilla_id', cuadrillaId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[CuadrillaRuta] ❌ Error obteniendo ruta:', formatSupabaseError(error));
      return { data: null, error };
    }

    console.log(`[CuadrillaRuta] ✅ Ruta obtenida: ${data?.length || 0} puntos`);
    return { data, error: null };
  } catch (err: any) {
    console.error('[CuadrillaRuta] ❌ Excepción obteniendo ruta:', err);
    return { data: null, error: err };
  }
}

export async function getRutaByCuadrillaIdTimeRange(
  cuadrillaId: number,
  startTime: Date,
  endTime: Date
): Promise<{ data: CuadrillaRutaDB[] | null; error: any }> {
  try {
    console.log(`[CuadrillaRuta] 📡 Obteniendo ruta de cuadrilla ${cuadrillaId} entre ${startTime.toISOString()} y ${endTime.toISOString()}...`);

    const { data, error } = await supabase
      .from('cuadrilla_ruta')
      .select('*')
      .eq('cuadrilla_id', cuadrillaId)
      .gte('timestamp', startTime.toISOString())
      .lte('timestamp', endTime.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      console.error('[CuadrillaRuta] ❌ Error obteniendo ruta por rango:', formatSupabaseError(error));
      return { data: null, error };
    }

    console.log(`[CuadrillaRuta] ✅ Ruta obtenida: ${data?.length || 0} puntos`);
    return { data, error: null };
  } catch (err: any) {
    console.error('[CuadrillaRuta] ❌ Excepción obteniendo ruta por rango:', err);
    return { data: null, error: err };
  }
}

export async function deleteCuadrillaRutaOlderThan(days: number): Promise<{ error: any }> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    console.log(`[CuadrillaRuta] 🗑️  Eliminando rutas anteriores a ${cutoffDate.toISOString()}...`);

    const { error } = await supabase
      .from('cuadrilla_ruta')
      .delete()
      .lt('timestamp', cutoffDate.toISOString());

    if (error) {
      console.error('[CuadrillaRuta] ❌ Error eliminando rutas antiguas:', formatSupabaseError(error));
      return { error };
    }

    console.log('[CuadrillaRuta] ✅ Rutas antiguas eliminadas exitosamente');
    return { error: null };
  } catch (err: any) {
    console.error('[CuadrillaRuta] ❌ Excepción eliminando rutas antiguas:', err);
    return { error: err };
  }
}

export async function getTotalRutaPoints(): Promise<{ count: number; error: any }> {
  try {
    const { count, error } = await supabase
      .from('cuadrilla_ruta')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[CuadrillaRuta] ❌ Error obteniendo total de puntos:', formatSupabaseError(error));
      return { count: 0, error };
    }

    console.log(`[CuadrillaRuta] 📊 Total de puntos de ruta: ${count || 0}`);
    return { count: count || 0, error: null };
  } catch (err: any) {
    console.error('[CuadrillaRuta] ❌ Excepción obteniendo total de puntos:', err);
    return { count: 0, error: err };
  }
}
