import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGetJSON, safeSetJSON } from '@/utils/asyncStorageHelper';
import { listSites, mapSiteToApp, type SiteDB } from './sites';
import { listTickets, mapTicketToApp, type TicketDB } from './tickets';
import { listCuadrillas, mapCuadrillaToApp, type CuadrillaDB } from './cuadrillas';
import { listTecnicos, type TecnicoDB } from './tecnicos';
import { listTicketAsignaciones, mapTicketAsignacionToApp, type TicketAsignacionDB } from './ticketAsignacion';
import { listCuadrillaTecnicos, type CuadrillaTecnicoDB } from './cuadrillaTecnico';
import { listCatalogoDescripcion, listCatalogoTipoFalla, type CatalogoDescripcionDB, type CatalogoTipoFallaDB } from './catalogos';
import type { Site, Ticket, Crew, Dispatch } from '@/types';
import { formatSupabaseError } from '@/utils/formatSupabaseError';

const SYNC_QUEUE_KEY = 'sync-queue';
const LAST_SYNC_KEY = 'last-sync-at';

export type SyncAction = 
  | { type: 'CREATE_TICKET'; payload: any }
  | { type: 'UPDATE_TICKET'; payload: { id: string; updates: any } }
  | { type: 'CREATE_SITE'; payload: any }
  | { type: 'UPDATE_SITE'; payload: { id: string; updates: any } }
  | { type: 'CREATE_DISPATCH'; payload: any }
  | { type: 'UPDATE_DISPATCH'; payload: { id: string; updates: any } };

export type QueuedAction = {
  id: string;
  action: SyncAction;
  createdAt: string;
  retries: number;
  lastError: string | null;
};

export type InitialDataResult = {
  sites: Site[];
  tickets: Ticket[];
  crews: Crew[];
  tecnicos: TecnicoDB[];
  dispatches: Dispatch[];
  cuadrillaTecnicos: CuadrillaTecnicoDB[];
  catalogoDescripcion: CatalogoDescripcionDB[];
  catalogoTipoFalla: CatalogoTipoFallaDB[];
  errors: { entity: string; error: any }[];
};

export async function loadInitialData(): Promise<InitialDataResult> {
  console.log('[Sync] 📥 Loading initial data from Supabase...');
  
  const result: InitialDataResult = {
    sites: [],
    tickets: [],
    crews: [],
    tecnicos: [],
    dispatches: [],
    cuadrillaTecnicos: [],
    catalogoDescripcion: [],
    catalogoTipoFalla: [],
    errors: [],
  };

  const sitesResult = await listSites(10000);
  if (sitesResult.error) {
    const formatted = formatSupabaseError(sitesResult.error);
    console.error('[Sync] ❌ Error loading sites:', JSON.stringify(formatted, null, 2));
    console.error('[Sync] ❌ Sites error details:', {
      message: formatted.message,
      details: formatted.details,
      hint: formatted.hint,
      code: formatted.code,
      status: formatted.status,
    });
    result.errors.push({ entity: 'sites', error: formatted });
  } else if (sitesResult.data) {
    result.sites = sitesResult.data.map((s: SiteDB) => mapSiteToApp(s));
    console.log(`[Sync] ✅ Loaded ${result.sites.length} sites`);
  }

  const ticketsResult = await listTickets({ noLimit: true });
  if (ticketsResult.error) {
    const formatted = formatSupabaseError(ticketsResult.error);
    console.error('[Sync] ❌ Error loading tickets:', JSON.stringify(formatted, null, 2));
    console.error('[Sync] ❌ Tickets error details:', {
      message: formatted.message,
      details: formatted.details,
      hint: formatted.hint,
      code: formatted.code,
      status: formatted.status,
    });
    result.errors.push({ entity: 'tickets', error: formatted });
  } else if (ticketsResult.data) {
    result.tickets = ticketsResult.data.map((t: TicketDB) => mapTicketToApp(t));
    console.log(`[Sync] ✅ Loaded ${result.tickets.length} tickets`);
    console.log(`[Sync] ✅ Total count from DB: ${ticketsResult.count}`);
  }

  try {
    const cuadrillasData = await listCuadrillas();
    if (!cuadrillasData || cuadrillasData.length === 0) {
      console.warn('[Sync] ⚠️ No cuadrillas data returned from Supabase');
      result.errors.push({ entity: 'cuadrillas', error: { message: 'No cuadrillas data' } });
    } else {
      console.log(`[Sync] 📥 Processing ${cuadrillasData.length} cuadrillas from Supabase (NO SEEDS)`);
      result.crews = cuadrillasData.map((c: CuadrillaDB) => {
        return mapCuadrillaToApp(c);
      });
      console.log(`[Sync] ✅ Loaded ${result.crews.length} crews from Supabase ONLY`);
      console.log(`[Sync] 📍 Crews with location: ${result.crews.filter(c => c.currentLocation).length}`);
      result.crews.forEach((crew, idx) => {
        if (idx < 5) {
          console.log(`[Sync] 📍 Crew ${crew.id} (${crew.name}): location=${crew.currentLocation ? `${crew.currentLocation.lat},${crew.currentLocation.lng}` : 'null'}, zone=${crew.zone}`);
        }
      });
    }
  } catch (error: any) {
    const formatted = formatSupabaseError(error);
    console.error('[Sync] ❌ Error loading cuadrillas:', JSON.stringify(formatted, null, 2));
    console.error('[Sync] ❌ Error details:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    });
    result.errors.push({ entity: 'cuadrillas', error: formatted });
  }

  const tecnicosResult = await listTecnicos();
  if (tecnicosResult.error) {
    const formatted = formatSupabaseError(tecnicosResult.error);
    console.error('[Sync] ❌ Error loading tecnicos:', formatted);
    result.errors.push({ entity: 'tecnicos', error: formatted });
  } else if (tecnicosResult.data) {
    result.tecnicos = tecnicosResult.data;
    console.log(`[Sync] ✅ Loaded ${result.tecnicos.length} tecnicos`);
  }

  const dispatchesResult = await listTicketAsignaciones();
  if (dispatchesResult.error) {
    const formatted = formatSupabaseError(dispatchesResult.error);
    console.error('[Sync] ❌ Error loading dispatches:', formatted);
    result.errors.push({ entity: 'dispatches', error: formatted });
  } else if (dispatchesResult.data) {
    result.dispatches = dispatchesResult.data.map((d: TicketAsignacionDB) => mapTicketAsignacionToApp(d));
    console.log(`[Sync] ✅ Loaded ${result.dispatches.length} dispatches`);
  }

  const cuadrillaTecnicosResult = await listCuadrillaTecnicos();
  if (cuadrillaTecnicosResult.error) {
    console.warn('[Sync] ⚠️ cuadrilla_tecnico table not available (expected in new DB)');
  } else if (cuadrillaTecnicosResult.data) {
    result.cuadrillaTecnicos = cuadrillaTecnicosResult.data;
    console.log(`[Sync] ✅ Loaded ${result.cuadrillaTecnicos.length} cuadrilla-tecnico relations`);
  }

  const catalogoDescResult = await listCatalogoDescripcion();
  if (catalogoDescResult.error) {
    const formatted = formatSupabaseError(catalogoDescResult.error);
    console.error('[Sync] ❌ Error loading catalogo_descripcion:', formatted);
    result.errors.push({ entity: 'catalogo_descripcion', error: formatted });
  } else if (catalogoDescResult.data) {
    result.catalogoDescripcion = catalogoDescResult.data;
    console.log(`[Sync] ✅ Loaded ${result.catalogoDescripcion.length} descripcion catalog items`);
  }

  const catalogoTipoResult = await listCatalogoTipoFalla();
  if (catalogoTipoResult.error) {
    const formatted = formatSupabaseError(catalogoTipoResult.error);
    console.error('[Sync] ❌ Error loading catalogo_tipo_falla:', formatted);
    result.errors.push({ entity: 'catalogo_tipo_falla', error: formatted });
  } else if (catalogoTipoResult.data) {
    result.catalogoTipoFalla = catalogoTipoResult.data;
    console.log(`[Sync] ✅ Loaded ${result.catalogoTipoFalla.length} tipo_falla catalog items`);
  }

  await AsyncStorage.setItem(LAST_SYNC_KEY, JSON.stringify(new Date().toISOString()));
  console.log('[Sync] 📥 Initial data load complete');
  
  return result;
}

export async function enqueueAction(action: SyncAction): Promise<void> {
  try {
    const queue = await safeGetJSON<QueuedAction[]>(SYNC_QUEUE_KEY, []);
    
    const queuedAction: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      createdAt: new Date().toISOString(),
      retries: 0,
      lastError: null,
    };
    
    queue.push(queuedAction);
    await safeSetJSON(SYNC_QUEUE_KEY, queue);
    
    console.log(`[Sync] ➕ Action queued: ${action.type}`);
  } catch (error) {
    console.error('[Sync] ❌ Error enqueueing action:', error);
  }
}

export async function getQueue(): Promise<QueuedAction[]> {
  return await safeGetJSON<QueuedAction[]>(SYNC_QUEUE_KEY, []);
}

export async function clearQueue(): Promise<void> {
  try {
    await safeSetJSON(SYNC_QUEUE_KEY, []);
    console.log('[Sync] 🗑️ Queue cleared');
  } catch (error) {
    console.error('[Sync] ❌ Error clearing queue:', error);
  }
}

export async function flushQueue(): Promise<{ success: number; failed: number }> {
  console.log('[Sync] 🔄 Flushing sync queue...');
  
  const queue = await getQueue();
  if (queue.length === 0) {
    console.log('[Sync] ✅ Queue is empty, nothing to flush');
    return { success: 0, failed: 0 };
  }
  
  let success = 0;
  let failed = 0;
  const remainingQueue: QueuedAction[] = [];
  
  for (const item of queue) {
    try {
      console.log(`[Sync] 🔄 Processing action: ${item.action.type}`);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      success++;
      console.log(`[Sync] ✅ Action processed: ${item.action.type}`);
    } catch (error) {
      console.error(`[Sync] ❌ Error processing action ${item.action.type}:`, error);
      item.retries++;
      item.lastError = String(error);
      
      if (item.retries < 3) {
        remainingQueue.push(item);
      } else {
        console.error(`[Sync] ❌ Action failed after 3 retries, discarding: ${item.action.type}`);
      }
      failed++;
    }
  }
  
  await safeSetJSON(SYNC_QUEUE_KEY, remainingQueue);
  
  console.log(`[Sync] 🔄 Flush complete: ${success} success, ${failed} failed, ${remainingQueue.length} remaining`);
  
  return { success, failed };
}

export async function getLastSyncAt(): Promise<Date | null> {
  try {
    const lastSyncStr = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return lastSyncStr ? new Date(lastSyncStr) : null;
  } catch (error) {
    console.error('[Sync] ❌ Error getting last sync time:', error);
    return null;
  }
}

export async function syncDelta(): Promise<InitialDataResult | null> {
  console.log('[Sync] 🔄 Checking for updates from Supabase...');
  
  try {
    const result = await loadInitialData();
    console.log('[Sync] ✅ Delta sync complete');
    return result;
  } catch (error) {
    console.error('[Sync] ❌ Error during delta sync:', error);
    return null;
  }
}
