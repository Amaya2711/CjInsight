import { supabase } from '@/utils/supabase';
import type { Ticket } from '@/types';

export type SeveridadEnum = 'BAJA' | 'MEDIA' | 'MEDIA-ALTA' | 'ALTA';
export type EstadoTicketEnum = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'CERRADO';

export type TicketDB = {
  id: string; // uuid
  ticket_source?: string | null;
  site_id?: string | null;
  site_name?: string | null;
  fault_level?: string | null;
  fault_occur_time?: string | null;
  complete_time?: string | null;
  task_category?: string | null;
  task_subcategory?: string | null;
  platform_affected?: string | null;
  attention_type?: string | null;
  service_affected?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  estado?: string | null;
  created_by?: string | null;
  descripcion?: string | null;
};

export type TicketInsert = Omit<TicketDB, 'id' | 'updated_at'>;

export async function listTickets(
  options: {
    page?: number;
    pageSize?: number;
    searchQuery?: string;
    status?: string;
    noLimit?: boolean;
  } = {}
) {
  try {
    const { page = 0, pageSize = 50, searchQuery, status, noLimit = false } = options;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('tickets_v1')
      .select('*', { count: 'exact' })
      .order('fault_occur_time', { ascending: false });

    if (status && status !== 'ALL') {
      if (status === 'recepcion') {
        query = query.or('estado.ilike.%recepcion%,estado.ilike.%nuevo%,estado.ilike.%pendiente%,estado.is.null');
      } else if (status === 'asignar') {
        query = query.or('estado.ilike.%asignar%,estado.ilike.%asignado%');
      } else if (status === 'arribo') {
        query = query.ilike('estado', '%arribo%');
      } else if (status === 'neutralizar') {
        query = query.or('estado.ilike.%neutralizar%,estado.ilike.%neutralizado%');
      } else if (status === 'validar') {
        query = query.or('estado.ilike.%validar%,estado.ilike.%validado%');
      } else if (status === 'cierre') {
        query = query.or('estado.ilike.%cierre%,estado.ilike.%cerrado%,estado.ilike.%completado%');
      } else {
        query = query.ilike('estado', `%${status}%`);
      }
    }

    if (searchQuery && searchQuery.trim()) {
      const search = searchQuery.trim();
      query = query.or(`ticket_source.ilike.%${search}%,site_name.ilike.%${search}%,site_id.ilike.%${search}%,task_category.ilike.%${search}%`);
    }

    if (!noLimit) {
      query = query.range(from, to);
    }
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[Tickets Service] Error loading tickets:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { data: null, error, count: 0 };
    }
    
    console.log(`[Tickets Service] Loaded ${data?.length || 0} tickets from tickets_v1 (total count: ${count})`);
    if (data && data.length > 0) {
      console.log(`[Tickets Service] Sample ticket keys:`, Object.keys(data[0]));
      console.log(`[Tickets Service] First ticket data:`, JSON.stringify(data[0], null, 2));
    }
    
    return { data, error: null, count };
  } catch (error: any) {
    console.error('[Tickets Service] Exception loading tickets:', {
      message: error?.message || String(error),
      name: error?.name,
      stack: error?.stack,
    });
    
    if (error?.message === 'Failed to fetch' || error?.name === 'TypeError') {
      console.error('[Tickets Service] ❌ NETWORK ERROR: Cannot reach Supabase');
      console.error('[Tickets Service] ❌ Check your internet connection and Supabase URL');
      console.error('[Tickets Service] ❌ Current Supabase URL should be: https://lgizmslffyaeeyogcdmm.supabase.co');
    }
    
    return { 
      data: null, 
      error: {
        message: `${error?.message || String(error)} - Cannot reach database`,
        details: error?.stack || 'Network error - check Supabase connection',
        hint: 'Verify internet connection and Supabase configuration',
        code: error?.code || 'NETWORK_ERROR',
      } as any,
      count: 0 
    };
  }
}

export async function getTicketById(id: string): Promise<TicketDB | null> {
  console.log('[tickets] getTicketById searching for:', id);
  
  let { data, error } = await supabase
    .from('tickets_v1')
    .select('*')
    .eq('ticket_source', id)
    .maybeSingle();
  
  if (!data && !error) {
    console.log('[tickets] Not found by ticket_source, trying by UUID id');
    const result = await supabase
      .from('tickets_v1')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    data = result.data;
    error = result.error;
  }
  
  if (error) {
    console.warn('[tickets] getTicketById error', error);
    return null;
  }
  
  console.log('[tickets] Found ticket:', data ? 'YES' : 'NO');
  return data as TicketDB | null;
}

export async function getTicketBySource(ticketSource: string) {
  const { data, error } = await supabase
    .from('tickets_v1')
    .select('*')
    .eq('ticket_source', ticketSource)
    .maybeSingle();
  
  return { data, error };
}

export async function createTicket(ticket: TicketInsert) {
  const { data, error } = await supabase
    .from('tickets_v1')
    .insert(ticket)
    .select()
    .single();
  
  return { data, error };
}

export async function updateTicket(id: string, updates: Partial<TicketInsert>) {
  const { data, error } = await supabase
    .from('tickets_v1')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
}

export async function deleteTicket(id: string) {
  const { data, error } = await supabase
    .from('tickets_v1')
    .delete()
    .eq('id', id);
  
  return { data, error };
}

export async function upsertBulkTickets(tickets: TicketInsert[]) {
  const { data, error } = await supabase
    .from('tickets_v1')
    .insert(tickets)
    .select();
  
  return { data, error };
}

export function mapTicketToApp(ticketDB: TicketDB): Ticket {
  let status: Ticket['status'] = 'recepcion';
  
  if (ticketDB.estado) {
    const estadoUpper = ticketDB.estado.toUpperCase();
    if (estadoUpper === 'RECEPCION' || estadoUpper === 'NUEVO' || estadoUpper === 'PENDIENTE') {
      status = 'recepcion';
    } else if (estadoUpper === 'ASIGNAR' || estadoUpper === 'ASIGNADO') {
      status = 'asignar';
    } else if (estadoUpper === 'ARRIBO') {
      status = 'arribo';
    } else if (estadoUpper === 'NEUTRALIZAR' || estadoUpper === 'NEUTRALIZADO') {
      status = 'neutralizar';
    } else if (estadoUpper === 'VALIDAR' || estadoUpper === 'VALIDADO') {
      status = 'validar';
    } else if (estadoUpper === 'CIERRE' || estadoUpper === 'CERRADO' || estadoUpper === 'COMPLETADO') {
      status = 'cierre';
    }
  } else if (ticketDB.complete_time) {
    status = 'cierre';
  }
  
  let priority: Ticket['priority'] = 'P2';
  const faultLevel = ticketDB.fault_level?.toUpperCase() || '';
  if (faultLevel.includes('CRITICAL') || faultLevel.includes('URGENT')) {
    priority = 'P0';
  } else if (faultLevel.includes('HIGH') || faultLevel.includes('MAJOR')) {
    priority = 'P1';
  } else if (faultLevel.includes('MEDIUM') || faultLevel.includes('MODERATE')) {
    priority = 'P2';
  } else {
    priority = 'P3';
  }

  const ticketId = ticketDB.ticket_source || `tck-${ticketDB.id || Math.random().toString(36).substr(2, 9)}`;
  const siteId = ticketDB.site_id || ticketDB.site_name || 'unknown';
  const description = ticketDB.task_category || 'Sin descripción';
  const openDate = ticketDB.fault_occur_time ? new Date(ticketDB.fault_occur_time) : new Date();
  const closedDate = ticketDB.complete_time ? new Date(ticketDB.complete_time) : null;

  console.log('[mapTicketToApp] Ticket mapping:', {
    id: ticketId,
    siteId,
    site_id: ticketDB.site_id,
    site_name: ticketDB.site_name
  });

  return {
    id: ticketId,
    itsmRef: ticketDB.ticket_source || null,
    priority: priority,
    status: status,
    siteId: siteId,
    isDependent: false,
    openedAt: openDate,
    neutralizedAt: null,
    closedAt: closedDate,
    slaDeadlineAt: null,
    exclusionCause: null,
    recurrenceFlag: false,
    description: description,
    interventionType: ticketDB.attention_type as any || null,
    ticketSource: ticketDB.ticket_source,
    siteName: ticketDB.site_name,
    faultLevel: ticketDB.fault_level,
    faultOccurTime: ticketDB.fault_occur_time,
    completeTime: ticketDB.complete_time,
    taskSubcategory: ticketDB.task_subcategory,
    platformAffected: ticketDB.platform_affected,
    serviceAffected: ticketDB.service_affected,
    createdAt: ticketDB.created_at,
    updatedAt: ticketDB.updated_at,
    createdBy: ticketDB.created_by,
    descripcion: ticketDB.descripcion,
  } as any;
}

export function mapTicketFromApp(ticket: Ticket): TicketInsert {
  return {
    ticket_source: ticket.id,
    site_id: ticket.siteId,
    site_name: ticket.siteId,
    fault_level: ticket.priority === 'P0' ? 'CRITICAL' : ticket.priority === 'P1' ? 'HIGH' : ticket.priority === 'P2' ? 'MEDIUM' : 'LOW',
    task_category: ticket.description || 'Sin categoría',
    task_subcategory: ticket.description,
    attention_type: ticket.interventionType || null,
    fault_occur_time: ticket.openedAt.toISOString(),
    complete_time: ticket.closedAt ? ticket.closedAt.toISOString() : null,
  };
}

export async function getTicketsTotalCount(): Promise<number> {
  const { count, error } = await supabase
    .from('tickets_v1')
    .select('id', { head: true, count: 'exact' });
  if (error) throw error;
  return count ?? 0;
}

export type TicketsMeta = {
  total: number;
  max_updated_at: string | null;
};

export async function getTicketsMeta(): Promise<TicketsMeta> {
  const total = await getTicketsTotalCount();
  const { data, error } = await supabase
    .from('tickets_v1')
    .select('updated_at')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const max_updated_at = (data?.[0]?.updated_at as string) ?? null;
  return { total, max_updated_at };
}

export async function healthCheckTickets(getLocalMeta?: () => TicketsMeta | null) {
  const remote = await getTicketsMeta();
  const local = getLocalMeta?.() ?? null;

  console.log('[tickets] META remote:', remote);
  if (local) {
    console.log('[tickets] META local :', local);
    const sameTotal = remote.total === local.total;
    const sameMax = (remote.max_updated_at ?? '') === (local.max_updated_at ?? '');
    if (!sameTotal || !sameMax) {
      console.warn('[tickets] Diferencias detectadas (se debe actualizar)');
    } else {
      console.log('[tickets] Local y remoto coinciden');
    }
  }
  return remote;
}

export async function listTicketsSince(isoDate: string, limit = 1000) {
  const { data, error } = await supabase
    .from('tickets_v1')
    .select('*')
    .gte('updated_at', isoDate)
    .order('updated_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as TicketDB[];
}

export type StatusCount = {
  recepcion: number;
  asignar: number;
  arribo: number;
  neutralizar: number;
  validar: number;
  cierre: number;
  total: number;
};

export async function getTicketsCountByStatus(): Promise<StatusCount> {
  const { count: totalCount, error: totalError } = await supabase
    .from('tickets_v1')
    .select('id', { count: 'exact', head: true });
  
  if (totalError) {
    console.error('[Tickets] Error counting total:', totalError);
    return {
      recepcion: 0,
      asignar: 0,
      arribo: 0,
      neutralizar: 0,
      validar: 0,
      cierre: 0,
      total: 0,
    };
  }

  const countByEstado = async (estado: string) => {
    const { count } = await supabase
      .from('tickets_v1')
      .select('id', { count: 'exact', head: true })
      .ilike('estado', `%${estado}%`);
    return count || 0;
  };

  const countByEstados = async (estados: string[]) => {
    const { count } = await supabase
      .from('tickets_v1')
      .select('id', { count: 'exact', head: true })
      .or(estados.map(e => `estado.ilike.%${e}%`).join(','));
    return count || 0;
  };

  const countNullEstado = async () => {
    const { count } = await supabase
      .from('tickets_v1')
      .select('id', { count: 'exact', head: true })
      .is('estado', null);
    return count || 0;
  };

  const countEmptyEstado = async () => {
    const { count } = await supabase
      .from('tickets_v1')
      .select('id', { count: 'exact', head: true })
      .eq('estado', '');
    return count || 0;
  };

  const [recepcion, asignar, arribo, neutralizar, validar, cierre, nullCount, emptyCount] = await Promise.all([
    countByEstados(['recepcion', 'nuevo', 'pendiente']),
    countByEstados(['asignar', 'asignado']),
    countByEstado('arribo'),
    countByEstados(['neutralizar', 'neutralizado']),
    countByEstados(['validar', 'validado']),
    countByEstados(['cierre', 'cerrado', 'completado']),
    countNullEstado(),
    countEmptyEstado(),
  ]);

  return {
    recepcion: recepcion + nullCount + emptyCount,
    asignar,
    arribo,
    neutralizar,
    validar,
    cierre,
    total: totalCount || 0,
  };
}
