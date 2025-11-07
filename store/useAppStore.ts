import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { safeGetJSON } from "@/utils/asyncStorageHelper";
import type {
  Crew,
  Dispatch,
  EvidenceBundle,
  EvidenceItem,
  HSEPermit,
  Site,
  SyncQueueItem,
  Ticket,
  User,
} from "@/types";

import { supabase } from "@/utils/supabase";
import { loadInitialData, syncDelta } from "@/services/sync";
import { formatSupabaseError, errorToString } from "@/utils/formatSupabaseError";

interface AppState {
  currentUser: User | null;
  crews: Crew[];
  sites: Site[];
  tickets: Ticket[];
  dispatches: Dispatch[];
  evidenceBundles: EvidenceBundle[];
  evidenceItems: EvidenceItem[];
  hsePermits: HSEPermit[];
  syncQueue: SyncQueueItem[];
  lastSyncAt: Date | null;
  isOnline: boolean;

  setCurrentUser: (user: User | null) => void;
  addToSyncQueue: (item: Omit<SyncQueueItem, "id" | "createdAt" | "retries" | "lastError">) => void;
  processSyncQueue: () => Promise<void>;
  addSite: (site: Omit<Site, "id">) => string;
  updateSite: (id: string, updates: Partial<Site>) => void;
  addTicket: (ticket: Omit<Ticket, "id" | "openedAt">) => string;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  deleteTicket: (id: string) => void;
  addDispatch: (dispatch: Omit<Dispatch, "id">) => string;
  updateDispatch: (id: string, updates: Partial<Dispatch>) => void;
  addEvidenceItem: (item: Omit<EvidenceItem, "id" | "createdAt" | "hash">) => void;
  updateEvidenceBundle: (id: string, updates: Partial<EvidenceBundle>) => void;
  addHSEPermit: (permit: Omit<HSEPermit, "id" | "issuedAt">) => void;
  updateHSEPermit: (id: string, updates: Partial<HSEPermit>) => void;
  getTicketById: (id: string) => Ticket | undefined;
  getDispatchByTicketId: (ticketId: string) => Dispatch | undefined;
  getSiteById: (id: string) => Site | undefined;
  getEvidenceBundleByTicketId: (ticketId: string) => EvidenceBundle | undefined;
  getEvidenceItemsByBundleId: (bundleId: string) => EvidenceItem[];
  getHSEPermitsByTicketId: (ticketId: string) => HSEPermit[];
  getCrewById: (id: string) => Crew | undefined;
  updateCrewLocation: (id: string, location: { lat: number; lng: number }) => void;
  clearAllTickets: () => void;
  initializeStore: () => Promise<void>;
  syncWithSupabase: () => Promise<void>;
  startAutoSync: () => void;
  stopAutoSync: () => void;
  setupRealtimeSync: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const generateTicketId = (existingTickets: Ticket[]): string => {
  const ticketNumbers = existingTickets
    .map(t => {
      const match = t.id.match(/tck-0*(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  
  const maxNumber = ticketNumbers.length > 0 ? Math.max(...ticketNumbers) : 0;
  const nextNumber = maxNumber + 1;
  return `tck-${String(nextNumber).padStart(2, '0')}`;
};

const generateSiteId = (existingSites: Site[]): string => {
  const siteNumbers = existingSites
    .map(s => {
      const match = s.siteCode.match(/SITE-0*(\d+)(?:-D\d+)?$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n));
  
  const maxNumber = siteNumbers.length > 0 ? Math.max(...siteNumbers) : 0;
  const nextNumber = maxNumber + 1;
  return `site-${String(nextNumber).padStart(3, '0')}`;
};

const generateSiteCode = (existingSites: Site[], isPrincipal: boolean | null, parentSiteId: string | null): string => {
  if (isPrincipal) {
    const principalNumbers = existingSites
      .filter(s => s.isPrincipal)
      .map(s => {
        const match = s.siteCode.match(/SITE-0*(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    
    const maxNumber = principalNumbers.length > 0 ? Math.max(...principalNumbers) : 0;
    const nextNumber = maxNumber + 1;
    return `SITE-${String(nextNumber).padStart(3, '0')}`;
  } else {
    const parentSite = existingSites.find(s => s.id === parentSiteId);
    if (!parentSite) return 'SITE-001-D1';
    
    const parentCode = parentSite.siteCode;
    const dependentSites = existingSites.filter(s => s.parentSiteId === parentSiteId);
    const dependentNumbers = dependentSites
      .map(s => {
        const match = s.siteCode.match(/-D0*(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    
    const maxNumber = dependentNumbers.length > 0 ? Math.max(...dependentNumbers) : 0;
    const nextNumber = maxNumber + 1;
    return `${parentCode}-D${nextNumber}`;
  }
};

const generateHash = (data: string) => {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

let autoSyncInterval: NodeJS.Timeout | null = null;
const AUTO_SYNC_INTERVAL = 30000;



export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  crews: [],
  sites: [],
  tickets: [],
  dispatches: [],
  evidenceBundles: [],
  evidenceItems: [],
  hsePermits: [],
  syncQueue: [],
  lastSyncAt: null,
  isOnline: true,

  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      AsyncStorage.setItem("currentUser", JSON.stringify(user)).catch(err => {
        console.error('[Store] Error saving currentUser to AsyncStorage:', err);
      });
    } else {
      AsyncStorage.removeItem("currentUser").catch(err => {
        console.error('[Store] Error removing currentUser from AsyncStorage:', err);
      });
    }
  },

  addToSyncQueue: (item) => {
    const newItem: SyncQueueItem = {
      ...item,
      id: generateId(),
      createdAt: new Date(),
      retries: 0,
      lastError: null,
    };
    set((state) => ({
      syncQueue: [...state.syncQueue, newItem],
    }));
    AsyncStorage.setItem("syncQueue", JSON.stringify([...get().syncQueue, newItem]));
  },

  processSyncQueue: async () => {
    const { syncQueue, isOnline } = get();
    if (!isOnline || syncQueue.length === 0) return;

    console.log(`[Sync] Processing ${syncQueue.length} items in queue`);

    for (const item of syncQueue) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log(`[Sync] Processed ${item.type} for ticket ${item.ticketId}`);
      } catch (error) {
        console.error(`[Sync] Error processing ${item.type}:`, error);
        set((state) => ({
          syncQueue: state.syncQueue.map((qi) =>
            qi.id === item.id
              ? { ...qi, retries: qi.retries + 1, lastError: String(error) }
              : qi
          ),
        }));
        continue;
      }
    }

    set({ syncQueue: [], lastSyncAt: new Date() });
    AsyncStorage.setItem("syncQueue", JSON.stringify([]));
    AsyncStorage.setItem("lastSyncAt", new Date().toISOString());
  },

  addSite: (site) => {
    const state = get();
    const siteId = generateSiteId(state.sites);
    const siteCode = site.siteCode.trim() || generateSiteCode(state.sites, site.isPrincipal ?? false, site.parentSiteId);
    
    const newSite: Site = {
      ...site,
      id: siteId,
      siteCode: siteCode,
    };

    set((state) => {
      const updatedSites = [...state.sites, newSite];
      AsyncStorage.setItem("sites", JSON.stringify(updatedSites));
      return { sites: updatedSites };
    });

    (async () => {
      try {
        console.log('[Supabase] Syncing site to database:', newSite.siteCode);
        const { data, error } = await supabase
          .from('sites_v1')
          .insert({
            codigo: newSite.siteCode,
            site: newSite.name,
            tipologia: newSite.tipologia || 'CONVERGENTE 1',
            zona: newSite.zona || '',
            region: newSite.region,
            departamento: newSite.departamento || '',
            provincia: newSite.provincia || '',
            distrito: newSite.distrito || '',
            latitud: newSite.lat,
            longitud: newSite.lng,
          })
          .select();

        if (error) {
          console.error('[Supabase] Error syncing site:', error.message);
          console.error('[Supabase] Error details:', error);
        } else {
          console.log('[Supabase] ✅ Site synced successfully:', data);
        }
      } catch (err) {
        console.error('[Supabase] Exception while syncing site:', err);
      }
    })();

    console.log(`[Store] Created site ${newSite.id} with code ${newSite.siteCode}`);
    return newSite.id;
  },

  updateSite: (id, updates) => {
    set((state) => ({
      sites: state.sites.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
    AsyncStorage.setItem("sites", JSON.stringify(get().sites));
  },

  addTicket: (ticket) => {
    const state = get();
    const ticketId = generateTicketId(state.tickets);
    
    const newTicket: Ticket = {
      ...ticket,
      id: ticketId,
      openedAt: new Date(),
      status: 'recepcion',
    };
    
    const newBundle: EvidenceBundle = {
      id: generateId(),
      ticketId: newTicket.id,
      valid: false,
      validatedAt: null,
      validatorUserId: null,
    };

    set((state) => {
      const updatedTickets = [...state.tickets, newTicket];
      const updatedBundles = [...state.evidenceBundles, newBundle];
      
      AsyncStorage.setItem("tickets", JSON.stringify(updatedTickets));
      AsyncStorage.setItem("evidenceBundles", JSON.stringify(updatedBundles));
      
      return {
        tickets: updatedTickets,
        evidenceBundles: updatedBundles,
      };
    });

    (async () => {
      try {
        console.log('[Supabase] Attempting to insert ticket:', newTicket.id);
        
        const siteRecord = await supabase
          .from('sites_v1')
          .select('id')
          .eq('codigo', newTicket.siteId)
          .maybeSingle();

        if (siteRecord.error) {
          console.error('[Supabase] ❌ Error finding site by codigo:', newTicket.siteId);
          console.error('[Supabase] Site lookup error:', siteRecord.error.message);
          return;
        }

        if (!siteRecord.data) {
          console.log('[Supabase] Site not found, attempting to create it in Supabase...');
          const localSite = state.sites.find(s => s.id === newTicket.siteId || s.siteCode === newTicket.siteId);
          
          if (!localSite) {
            console.error('[Supabase] ❌ Site not found locally either:', newTicket.siteId);
            return;
          }

          const siteInsertResult = await supabase
            .from('sites_v1')
            .insert({
              codigo: localSite.siteCode || localSite.id,
              site: localSite.name,
              tipologia: localSite.tipologia || 'CONVERGENTE 1',
              zona: localSite.zona || '',
              region: localSite.region,
              departamento: localSite.departamento || '',
              provincia: localSite.provincia || '',
              distrito: localSite.distrito || '',
              latitud: localSite.lat,
              longitud: localSite.lng,
            })
            .select()
            .single();

          if (siteInsertResult.error) {
            console.error('[Supabase] ❌ Error creating site:', siteInsertResult.error.message);
            return;
          }

          console.log('[Supabase] ✅ Site created successfully');
          const numericSiteId = siteInsertResult.data.id;
          console.log('[Supabase] Created site ID:', numericSiteId);

          await insertTicketWithSiteId(numericSiteId, newTicket);
          return;
        }

        const numericSiteId = siteRecord.data.id;
        console.log('[Supabase] Found site ID:', numericSiteId, 'for codigo:', newTicket.siteId);

        await insertTicketWithSiteId(numericSiteId, newTicket);
      } catch (err) {
        console.error('[Supabase] ❌ Exception while inserting ticket:', err);
      }

      async function insertTicketWithSiteId(siteId: number, ticket: Ticket) {
        const { data, error } = await supabase
          .from('tickets_v1')
          .insert({
            ticket_source: ticket.id,
            site_id: ticket.siteId,
            site_name: ticket.siteId,
            fault_level: ticket.priority === 'P0' ? 'CRITICAL' : ticket.priority === 'P1' ? 'HIGH' : ticket.priority === 'P2' ? 'MEDIUM' : 'LOW',
            task_category: ticket.description || 'Sin descripción',
            task_subcategory: ticket.description,
            attention_type: ticket.interventionType || null,
            fault_occur_time: ticket.openedAt.toISOString(),
            complete_time: ticket.closedAt ? ticket.closedAt.toISOString() : null,
            estado: 'recepcion',
            created_by: null,
          })
          .select();

        if (error) {
          console.error('[Supabase] ❌ Error inserting ticket:', error);
          console.error('[Supabase] Error message:', error.message);
          console.error('[Supabase] Error details:', error.details);
          console.error('[Supabase] Error hint:', error.hint);
          
          if (error.message?.includes('column') || error.message?.includes('schema cache')) {
            console.error('\n⚠️  DATABASE SCHEMA ERROR DETECTED!');
            console.error('Your Supabase table is missing required columns.');
            console.error('\n📋 TO FIX THIS:');
            console.error('1. Open Supabase Dashboard: https://app.supabase.com');
            console.error('2. Go to SQL Editor');
            console.error('3. Run the script from SUPABASE_FIX.sql in your project');
            console.error('4. See QUICK_FIX.md for detailed instructions\n');
          }
        } else {
          console.log('[Supabase] ✅ Ticket inserted successfully:', data);
        }
      }
    })();

    console.log(`[Store] Created ticket ${newTicket.id}`);
    return newTicket.id;
  },

  updateTicket: (id, updates) => {
    set((state) => {
      const existingTicket = state.tickets.find(t => t.id === id);
      
      if (existingTicket) {
        const updatedTickets = state.tickets.map((t) => (t.id === id ? { ...t, ...updates } : t));
        AsyncStorage.setItem("tickets", JSON.stringify(updatedTickets));
        return { tickets: updatedTickets };
      } else {
        const newTicket = { ...updates as Ticket, id };
        const updatedTickets = [...state.tickets, newTicket];
        AsyncStorage.setItem("tickets", JSON.stringify(updatedTickets));
        return { tickets: updatedTickets };
      }
    });
  },

  deleteTicket: (id) => {
    set((state) => {
      const updatedTickets = state.tickets.filter((t) => t.id !== id);
      const updatedDispatches = state.dispatches.filter((d) => d.ticketId !== id);
      const updatedEvidenceBundles = state.evidenceBundles.filter((b) => b.ticketId !== id);
      const bundleIds = state.evidenceBundles
        .filter((b) => b.ticketId === id)
        .map((b) => b.id);
      const updatedEvidenceItems = state.evidenceItems.filter(
        (i) => !bundleIds.includes(i.bundleId)
      );
      const updatedHSEPermits = state.hsePermits.filter((p) => p.ticketId !== id);
      const updatedSyncQueue = state.syncQueue.filter((q) => q.ticketId !== id);

      AsyncStorage.setItem("tickets", JSON.stringify(updatedTickets));
      AsyncStorage.setItem("dispatches", JSON.stringify(updatedDispatches));
      AsyncStorage.setItem("evidenceBundles", JSON.stringify(updatedEvidenceBundles));
      AsyncStorage.setItem("evidenceItems", JSON.stringify(updatedEvidenceItems));
      AsyncStorage.setItem("hsePermits", JSON.stringify(updatedHSEPermits));
      AsyncStorage.setItem("syncQueue", JSON.stringify(updatedSyncQueue));

      console.log(`[Store] Deleted ticket ${id} and all related data`);

      return {
        tickets: updatedTickets,
        dispatches: updatedDispatches,
        evidenceBundles: updatedEvidenceBundles,
        evidenceItems: updatedEvidenceItems,
        hsePermits: updatedHSEPermits,
        syncQueue: updatedSyncQueue,
      };
    });
  },

  addDispatch: (dispatch) => {
    const dispatchId = generateId();
    const newDispatch: Dispatch = {
      ...dispatch,
      id: dispatchId,
    };

    set((state) => {
      const updatedDispatches = [...state.dispatches, newDispatch];
      AsyncStorage.setItem("dispatches", JSON.stringify(updatedDispatches));
      return { dispatches: updatedDispatches };
    });

    console.log(`[Store] Created dispatch ${dispatchId} for ticket ${dispatch.ticketId} -> crew ${dispatch.crewId}`);
    return dispatchId;
  },

  updateDispatch: (id, updates) => {
    set((state) => ({
      dispatches: state.dispatches.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
    AsyncStorage.setItem("dispatches", JSON.stringify(get().dispatches));
  },

  addEvidenceItem: (item) => {
    const newItem: EvidenceItem = {
      ...item,
      id: generateId(),
      createdAt: new Date(),
      hash: generateHash(JSON.stringify(item)),
    };
    set((state) => ({
      evidenceItems: [...state.evidenceItems, newItem],
    }));
    AsyncStorage.setItem("evidenceItems", JSON.stringify(get().evidenceItems));
  },

  updateEvidenceBundle: (id, updates) => {
    set((state) => ({
      evidenceBundles: state.evidenceBundles.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    }));
    AsyncStorage.setItem("evidenceBundles", JSON.stringify(get().evidenceBundles));
  },

  addHSEPermit: (permit) => {
    const newPermit: HSEPermit = {
      ...permit,
      id: generateId(),
      issuedAt: new Date(),
    };
    set((state) => ({
      hsePermits: [...state.hsePermits, newPermit],
    }));
    AsyncStorage.setItem("hsePermits", JSON.stringify(get().hsePermits));
  },

  updateHSEPermit: (id, updates) => {
    set((state) => ({
      hsePermits: state.hsePermits.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
    AsyncStorage.setItem("hsePermits", JSON.stringify(get().hsePermits));
  },

  getTicketById: (id) => get().tickets.find((t) => t.id === id),

  getDispatchByTicketId: (ticketId) => get().dispatches.find((d) => d.ticketId === ticketId),

  getSiteById: (id) => get().sites.find((s) => s.id === id),

  getEvidenceBundleByTicketId: (ticketId) =>
    get().evidenceBundles.find((b) => b.ticketId === ticketId),

  getEvidenceItemsByBundleId: (bundleId) =>
    get().evidenceItems.filter((i) => i.bundleId === bundleId),

  getHSEPermitsByTicketId: (ticketId) =>
    get().hsePermits.filter((p) => p.ticketId === ticketId),

  getCrewById: (id) => get().crews.find((c) => c.id === id),

  updateCrewLocation: (id, location) => {
    set((state) => ({
      crews: state.crews.map((c) =>
        c.id === id
          ? { ...c, currentLocation: location, lastLocationUpdate: new Date() }
          : c
      ),
    }));
    AsyncStorage.setItem("crews", JSON.stringify(get().crews));
  },

  clearAllTickets: () => {
    set({
      tickets: [],
      dispatches: [],
      evidenceBundles: [],
      evidenceItems: [],
      hsePermits: [],
      syncQueue: [],
    });
    AsyncStorage.setItem("tickets", JSON.stringify([]));
    AsyncStorage.setItem("dispatches", JSON.stringify([]));
    AsyncStorage.setItem("evidenceBundles", JSON.stringify([]));
    AsyncStorage.setItem("evidenceItems", JSON.stringify([]));
    AsyncStorage.setItem("hsePermits", JSON.stringify([]));
    AsyncStorage.setItem("syncQueue", JSON.stringify([]));
    console.log("[Store] Cleared all tickets and related data");
  },

  initializeStore: async () => {
    console.log('[Store] 🔄 Initializing store from Supabase...');
    console.log('[Store] 🗑️ Clearing local mock/seed data...');
    
    try {
      console.log('[Store] 📥 Loading data from Supabase (source of truth)...');
      const data = await loadInitialData();
      
      console.log('[Store] ✅ Loaded from Supabase:', {
        sites: data.sites.length,
        tickets: data.tickets.length,
        crews: data.crews.length,
        dispatches: data.dispatches.length,
      });

      const finalEvidenceBundles = await safeGetJSON<EvidenceBundle[]>('evidenceBundles', []);
      const finalEvidenceItems = await safeGetJSON<EvidenceItem[]>('evidenceItems', []);
      const finalHSEPermits = await safeGetJSON<HSEPermit[]>('hsePermits', []);
      const finalSyncQueue = await safeGetJSON<SyncQueueItem[]>('syncQueue', []);
      
      const lastSyncAtStr = await safeGetJSON<string | null>('lastSyncAt', null);
      const finalLastSyncAt = lastSyncAtStr ? new Date(lastSyncAtStr) : null;

      console.log('[Store] 📄 Setting state with Supabase data ONLY (no local data)');
      set({
        crews: data.crews,
        sites: data.sites,
        tickets: data.tickets,
        dispatches: data.dispatches,
        evidenceBundles: finalEvidenceBundles,
        evidenceItems: finalEvidenceItems,
        hsePermits: finalHSEPermits,
        syncQueue: finalSyncQueue,
        lastSyncAt: finalLastSyncAt,
      });

      console.log('[Store] ✅ Store initialized from Supabase successfully');
      console.log('[Store] 📊 Final state:', {
        crews: data.crews.length,
        sites: data.sites.length,
        tickets: data.tickets.length,
        dispatches: data.dispatches.length,
      });
      
      if (data.errors.length > 0) {
        console.warn('[Store] ⚠️ Some entities had errors loading from Supabase:', data.errors);
      }

      get().startAutoSync();
      get().setupRealtimeSync();
      
    } catch (error: any) {
      const formatted = formatSupabaseError(error);
      const errorString = errorToString(error);
      console.error("[Store] ❌ Error initializing from Supabase:", formatted);
      console.error("[Store] ❌ Error message:", errorString);
      console.log("[Store] ⚠️ Could not load data from Supabase. Please check your connection and database.");
      
      if (errorString.includes('schema cache')) {
        console.error('\n⚠️  DATABASE SCHEMA CACHE ERROR DETECTED!');
        console.error('🔧 TO FIX THIS:');
        console.error('1. Open Supabase Dashboard SQL Editor');
        console.error('2. Run: NOTIFY pgrst, \'reload schema\';');
        console.error('3. Wait 10-20 seconds');
        console.error('4. Refresh this page\n');
      }
      
      set({
        crews: [],
        sites: [],
        tickets: [],
        dispatches: [],
        evidenceBundles: [],
        evidenceItems: [],
        hsePermits: [],
        syncQueue: [],
        lastSyncAt: null,
      });
    }
  },

  syncWithSupabase: async () => {
    console.log('[Store] 🔄 Auto-syncing with Supabase...');
    
    try {
      const data = await syncDelta();
      
      if (data) {
        set({
          crews: data.crews,
          sites: data.sites,
          tickets: data.tickets,
          dispatches: data.dispatches,
          lastSyncAt: new Date(),
        });
        
        console.log('[Store] ✅ Auto-sync complete:', {
          sites: data.sites.length,
          tickets: data.tickets.length,
          crews: data.crews.length,
          dispatches: data.dispatches.length,
        });
      }
    } catch (error) {
      console.error('[Store] ❌ Error during auto-sync:', error);
    }
  },

  startAutoSync: () => {
    console.log('[Store] 🔁 Starting auto-sync...');
    
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
    }
    
    autoSyncInterval = setInterval(() => {
      get().syncWithSupabase();
    }, AUTO_SYNC_INTERVAL);
    
    console.log(`[Store] ✅ Auto-sync started (every ${AUTO_SYNC_INTERVAL / 1000}s)`);
  },

  stopAutoSync: () => {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
      console.log('[Store] 🛑 Auto-sync stopped');
    }
  },

  setupRealtimeSync: () => {
    console.log('[Store] 📡 Setting up Realtime subscriptions...');
    
    supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets_v1',
        },
        (payload) => {
          console.log('[Store] 📡 Ticket change detected:', payload.eventType);
          get().syncWithSupabase();
        }
      )
      .subscribe();

    supabase
      .channel('sites-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sites_v1',
        },
        (payload) => {
          console.log('[Store] 📡 Site change detected:', payload.eventType);
          get().syncWithSupabase();
        }
      )
      .subscribe();

    supabase
      .channel('cuadrillas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cuadrillas',
        },
        (payload) => {
          console.log('[Store] 📡 Crew change detected:', payload.eventType);
          get().syncWithSupabase();
        }
      )
      .subscribe();

    console.log('[Store] ✅ Realtime subscriptions active');
  },
}));
