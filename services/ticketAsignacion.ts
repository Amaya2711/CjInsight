import { supabase } from '@/utils/supabase';
import type { Dispatch } from '@/types';

export type TicketAsignacionDB = {
  id: number;
  ticket_id: number;
  cuadrilla_id: number;
  asignado_at: string;
  aceptado_at: string | null;
  iniciado_at: string | null;
  finalizado_at: string | null;
  observaciones: string | null;
};

export type TicketAsignacionInsert = Omit<TicketAsignacionDB, 'id'>;

export async function listTicketAsignaciones() {
  const { data, error } = await supabase
    .from('ticket_asignacion')
    .select('*')
    .order('asignado_at', { ascending: false });
  
  return { data, error };
}

export async function getTicketAsignacionById(id: number) {
  const { data, error } = await supabase
    .from('ticket_asignacion')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
}

export async function getTicketAsignacionesByTicketId(ticketId: number) {
  const { data, error } = await supabase
    .from('ticket_asignacion')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('asignado_at', { ascending: false });
  
  return { data, error };
}

export async function getTicketAsignacionesByCuadrillaId(cuadrillaId: number) {
  const { data, error } = await supabase
    .from('ticket_asignacion')
    .select('*')
    .eq('cuadrilla_id', cuadrillaId)
    .order('asignado_at', { ascending: false });
  
  return { data, error };
}

export async function createTicketAsignacion(asignacion: TicketAsignacionInsert) {
  const { data, error } = await supabase
    .from('ticket_asignacion')
    .insert(asignacion)
    .select()
    .single();
  
  return { data, error };
}

export async function updateTicketAsignacion(id: number, updates: Partial<TicketAsignacionInsert>) {
  const { data, error } = await supabase
    .from('ticket_asignacion')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  return { data, error };
}

export async function deleteTicketAsignacion(id: number) {
  const { data, error } = await supabase
    .from('ticket_asignacion')
    .delete()
    .eq('id', id);
  
  return { data, error };
}

export async function upsertBulkTicketAsignaciones(asignaciones: TicketAsignacionInsert[]) {
  const { data, error } = await supabase
    .from('ticket_asignacion')
    .insert(asignaciones)
    .select();
  
  return { data, error };
}

export function mapTicketAsignacionToApp(asignacionDB: TicketAsignacionDB): Dispatch {
  return {
    id: `dispatch-${asignacionDB.id}`,
    ticketId: `tck-${asignacionDB.ticket_id}`,
    crewId: `crew-${asignacionDB.cuadrilla_id}`,
    scheduledAt: new Date(asignacionDB.asignado_at),
    windowStart: new Date(asignacionDB.asignado_at),
    windowEnd: new Date(new Date(asignacionDB.asignado_at).getTime() + 2 * 60 * 60 * 1000),
    eta: asignacionDB.iniciado_at ? new Date(asignacionDB.iniciado_at) : null,
    arrivedAt: asignacionDB.iniciado_at ? new Date(asignacionDB.iniciado_at) : null,
    departedAt: asignacionDB.finalizado_at ? new Date(asignacionDB.finalizado_at) : null,
    arrivalWindowOk: null,
    arrivalGeo: null,
    reasonLate: null,
  };
}

export function mapTicketAsignacionFromApp(dispatch: Dispatch, ticketDbId: number, cuadrillaDbId: number): TicketAsignacionInsert {
  return {
    ticket_id: ticketDbId,
    cuadrilla_id: cuadrillaDbId,
    asignado_at: dispatch.scheduledAt.toISOString(),
    aceptado_at: null,
    iniciado_at: dispatch.arrivedAt ? dispatch.arrivedAt.toISOString() : null,
    finalizado_at: dispatch.departedAt ? dispatch.departedAt.toISOString() : null,
    observaciones: null,
  };
}
