import { supabase } from '@/utils/supabase';

export type CatalogoDescripcionDB = {
  id: number;
  valor: string;
};

export type CatalogoTipoFallaDB = {
  id: number;
  valor: string;
};

export type CatalogoDescripcionInsert = Omit<CatalogoDescripcionDB, 'id'>;
export type CatalogoTipoFallaInsert = Omit<CatalogoTipoFallaDB, 'id'>;

export async function listCatalogoDescripcion() {
  const { data, error } = await supabase
    .from('catalogo_descripcion')
    .select('*')
    .order('valor', { ascending: true });
  
  return { data, error };
}

export async function listCatalogoTipoFalla() {
  const { data, error } = await supabase
    .from('catalogo_tipo_falla')
    .select('*')
    .order('valor', { ascending: true });
  
  return { data, error };
}

export async function createCatalogoDescripcion(item: CatalogoDescripcionInsert) {
  const { data, error } = await supabase
    .from('catalogo_descripcion')
    .insert(item)
    .select()
    .single();
  
  return { data, error };
}

export async function createCatalogoTipoFalla(item: CatalogoTipoFallaInsert) {
  const { data, error } = await supabase
    .from('catalogo_tipo_falla')
    .insert(item)
    .select()
    .single();
  
  return { data, error };
}

export async function upsertBulkCatalogoDescripcion(items: CatalogoDescripcionInsert[]) {
  const { data, error } = await supabase
    .from('catalogo_descripcion')
    .upsert(items, { onConflict: 'valor', ignoreDuplicates: false })
    .select();
  
  return { data, error };
}

export async function upsertBulkCatalogoTipoFalla(items: CatalogoTipoFallaInsert[]) {
  const { data, error } = await supabase
    .from('catalogo_tipo_falla')
    .upsert(items, { onConflict: 'valor', ignoreDuplicates: false })
    .select();
  
  return { data, error };
}
