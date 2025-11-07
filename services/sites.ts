import { supabase } from '@/utils/supabase';
import type { Site } from '@/types';

export type SiteDB = {
  id: number;
  codigo: string | null;
  site: string | null;
  latitud: number | null;
  longitud: number | null;
  zona?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  tipologia?: string | null;
  tecnologias?: string | null;
  region?: string | null;
  subregion?: string | null;
  created_at?: string;
};

export type SiteInsert = Omit<SiteDB, 'id' | 'created_at'>;

export async function listSites(
  options: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
  } | number = 10000
) {
  const limit = typeof options === 'number' ? options : undefined;
  const page = typeof options === 'object' ? options.page : undefined;
  const pageSize = typeof options === 'object' ? options.pageSize : undefined;
  const searchQuery = typeof options === 'object' ? options.searchQuery : undefined;
  
  let query = supabase
    .from('sites_v1')
    .select('id, codigo, site, latitud, longitud, zona, departamento, provincia, distrito, tipologia, tecnologias, region, subregion', { count: 'exact' })
    .order('site', { ascending: true });

  if (searchQuery && searchQuery.trim()) {
    const search = searchQuery.trim();
    query = query.or(`codigo.ilike.%${search}%,site.ilike.%${search}%,provincia.ilike.%${search}%,distrito.ilike.%${search}%,tipologia.ilike.%${search}%`);
  }

  if (page !== undefined && pageSize !== undefined) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  } else if (limit) {
    query = query.limit(limit);
  }
  
  const { data, error, count } = await query;
  
  console.log(`[Sites Service] Loaded ${data?.length || 0} sites from sites_v1, total count: ${count}`);
  
  return { data: data as SiteDB[], error, count };
}

export async function getSiteById(id: number) {
  const { data, error } = await supabase
    .from('sites_v1')
    .select('id, codigo, site, latitud, longitud, zona, departamento, provincia, distrito, tipologia, tecnologias, region, subregion')
    .eq('id', id)
    .single();
  
  return { data, error };
}

export async function getSiteByCodigo(codigo: string) {
  const { data, error } = await supabase
    .from('sites_v1')
    .select('id, codigo, site, latitud, longitud, zona, departamento, provincia, distrito, tipologia, tecnologias, region, subregion')
    .eq('codigo', codigo)
    .maybeSingle();
  
  return { data, error };
}

export async function createSite(site: SiteInsert) {
  console.log('[Sites] Creating site in Supabase:', site.codigo);
  const { data, error } = await supabase
    .from('sites_v1')
    .insert(site)
    .select()
    .single();
  
  if (error) {
    console.error('[Sites] Error creating site:', error.message);
    return { data: null, error };
  }
  
  console.log('[Sites] ✅ Site created successfully:', data);
  return { data: data as SiteDB, error: null };
}

export async function updateSite(id: number, updates: Partial<SiteInsert>) {
  console.log('[Sites] Updating site in Supabase:', id);
  const { data, error } = await supabase
    .from('sites_v1')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('[Sites] Error updating site:', error.message);
    return { data: null, error };
  }
  
  console.log('[Sites] ✅ Site updated successfully');
  return { data: data as SiteDB, error: null };
}

export async function deleteSite(id: number) {
  console.warn('[Sites] deleteSite is disabled - sites_v1 is read-only');
  return { data: null, error: new Error('Delete operation not supported on sites_v1') };
}

export async function upsertBulkSites(sites: SiteInsert[]) {
  console.warn('[Sites] upsertBulkSites is disabled - sites_v1 is read-only');
  return { data: null, error: new Error('Bulk upsert not supported on sites_v1') };
}

export function mapSiteToApp(siteDB: SiteDB): Site {
  const siteId = siteDB.codigo || `site-${siteDB.id}`;
  const siteName = (siteDB.site?.trim() || siteDB.codigo || `SITE-${siteDB.id}`);
  return {
    id: siteId,
    name: siteName,
    siteCode: siteDB.codigo || `SITE-${siteDB.id}`,
    tipologia: siteDB.tipologia || undefined,
    region: siteDB.region as any || 'LIMA',
    zona: siteDB.zona || 'N/A',
    departamento: siteDB.departamento || undefined,
    provincia: siteDB.provincia || undefined,
    distrito: siteDB.distrito || undefined,
    address: undefined,
    lat: siteDB.latitud || 0,
    lng: siteDB.longitud || 0,
    isPrincipal: null,
    parentSiteId: null,
  };
}

export function mapSiteFromApp(site: Omit<Site, 'id'>): SiteInsert {
  return {
    codigo: site.siteCode,
    site: site.name,
    tipologia: site.tipologia || null,
    tecnologias: null,
    region: site.region,
    subregion: null,
    zona: site.zona,
    departamento: site.departamento || null,
    provincia: site.provincia || null,
    distrito: site.distrito || null,
    latitud: site.lat,
    longitud: site.lng,
  };
}

export function getSiteTitle(s: SiteDB): string {
  return (s.site?.trim() || s.codigo || `SITE-${s.id}`);
}

export function toLatLng(row: SiteDB) {
  const lat = Number(String(row.latitud ?? '').replace(',', '.'));
  const lng = Number(String(row.longitud ?? '').replace(',', '.'));
  const ok = Number.isFinite(lat) && Number.isFinite(lng) &&
             lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  if (!ok) {
    console.warn('[Sites toLatLng] Invalid coordinates:', {
      id: row.id,
      codigo: row.codigo,
      latitud: row.latitud,
      longitud: row.longitud,
      parsed_lat: lat,
      parsed_lng: lng
    });
  }
  return ok ? { latitude: lat, longitude: lng } : null;
}

export async function getSitesTotalCount(): Promise<number> {
  const { count, error } = await supabase
    .from("sites_v1")
    .select("id", { head: true, count: "exact" });
  if (error) throw error;
  return count ?? 0;
}
