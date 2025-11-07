import { supabase } from '@/utils/supabase';

export type TecnicoDB = {
  id: number;
  dni: string | null;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  especialidad: string | null;
  activo: boolean;
  created_at: string;
};

export type TecnicoInsert = Omit<TecnicoDB, 'id' | 'created_at'>;

export async function listTecnicos() {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .order('nombre', { ascending: true });
  
  return { data, error };
}

export async function getTecnicoById(id: number) {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
}

export async function getTecnicoByDNI(dni: string) {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('*')
    .eq('dni', dni)
    .maybeSingle();
  
  return { data, error };
}

export async function createTecnico(tecnico: TecnicoInsert) {
  const { data, error } = await supabase
    .from('tecnicos')
    .insert(tecnico)
    .select()
    .single();
  
  return { data, error };
}

export async function updateTecnico(id: number, updates: Partial<TecnicoInsert>) {
  const { data, error } = await supabase
    .from('tecnicos')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
}

export async function deleteTecnico(id: number) {
  const { data, error } = await supabase
    .from('tecnicos')
    .delete()
    .eq('id', id);
  
  return { data, error };
}

export async function upsertBulkTecnicos(tecnicos: TecnicoInsert[]) {
  const { data, error } = await supabase
    .from('tecnicos')
    .insert(tecnicos)
    .select();
  
  return { data, error };
}
