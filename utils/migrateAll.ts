import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Site, Ticket, Crew, Dispatch } from '@/types';
import { upsertBulkCatalogoDescripcion, upsertBulkCatalogoTipoFalla, type CatalogoDescripcionInsert, type CatalogoTipoFallaInsert } from '@/services/catalogos';
import { upsertBulkSites, mapSiteFromApp, getSiteByCodigo } from '@/services/sites';
import { upsertBulkCuadrillas, mapCuadrillaFromApp, getCuadrillaByNombre } from '@/services/cuadrillas';
import { upsertBulkTecnicos, type TecnicoInsert } from '@/services/tecnicos';

import { upsertBulkTickets, mapTicketFromApp, getTicketBySource } from '@/services/tickets';
import { upsertBulkTicketAsignaciones, mapTicketAsignacionFromApp } from '@/services/ticketAsignacion';
import { generateCrews } from '@/store/seeds/crews';
import { SITES_DATA } from '@/store/seeds/sites';

export type MigrationStats = {
  catalogoDescripcion: number;
  catalogoTipoFalla: number;
  sites: number;
  tecnicos: number;
  cuadrillas: number;
  cuadrillaTecnico: number;
  tickets: number;
  ticketAsignacion: number;
  errors: { entity: string; error: any }[];
};

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function migrateAllData(
  onProgress?: (message: string, current: number, total: number) => void
): Promise<MigrationStats> {
  console.log('[Migration] 🚀 Starting migration to Supabase...');
  
  const stats: MigrationStats = {
    catalogoDescripcion: 0,
    catalogoTipoFalla: 0,
    sites: 0,
    tecnicos: 0,
    cuadrillas: 0,
    cuadrillaTecnico: 0,
    tickets: 0,
    ticketAsignacion: 0,
    errors: [],
  };

  const totalSteps = 8;
  let currentStep = 0;

  onProgress?.('Migrando catálogos...', ++currentStep, totalSteps);
  console.log('[Migration] 📋 Step 1/8: Migrating catalogs...');
  
  try {
    const descripcionValues: string[] = [
      'CORTE ENERGIA',
      'ENERGIA',
      'MBTS',
      'PEXT - Atenuacion de FO',
      'PEXT - Corte de FO',
      'PEXT - Falsa Averia',
      'RADIO',
      'RED - TRANSPORTE DE RED',
      'SEGURIDAD',
      'SISTEMA ELECTRICO',
      'TX',
    ];
    
    const catalogoDescripcion: CatalogoDescripcionInsert[] = descripcionValues.map(valor => ({ valor }));
    
    const catalogoTipoFalla: CatalogoTipoFallaInsert[] = [
      'Falla crítica en sistema de energía',
      'Mantenimiento preventivo',
      'Problema de conectividad',
      'Falla de radio enlace',
      'Problema de fibra óptica',
      'Sin descripción',
    ].map(valor => ({ valor }));
    
    const descResult = await upsertBulkCatalogoDescripcion(catalogoDescripcion);
    if (descResult.error) {
      console.error('[Migration] ❌ Error migrating catalogo_descripcion:', descResult.error.message);
      stats.errors.push({ entity: 'catalogo_descripcion', error: descResult.error });
    } else {
      stats.catalogoDescripcion = descResult.data?.length || 0;
      console.log(`[Migration] ✅ Migrated ${stats.catalogoDescripcion} descripcion items`);
    }
    
    const tipoResult = await upsertBulkCatalogoTipoFalla(catalogoTipoFalla);
    if (tipoResult.error) {
      console.error('[Migration] ❌ Error migrating catalogo_tipo_falla:', tipoResult.error.message);
      stats.errors.push({ entity: 'catalogo_tipo_falla', error: tipoResult.error });
    } else {
      stats.catalogoTipoFalla = tipoResult.data?.length || 0;
      console.log(`[Migration] ✅ Migrated ${stats.catalogoTipoFalla} tipo_falla items`);
    }
  } catch (err) {
    console.error('[Migration] ❌ Exception migrating catalogs:', err);
    stats.errors.push({ entity: 'catalogs', error: err });
  }

  onProgress?.('Migrando sites...', ++currentStep, totalSteps);
  console.log('[Migration] 📋 Step 2/8: Migrating sites...');
  
  try {
    const storedSitesJson = await AsyncStorage.getItem('sites');
    let localSites: Site[] = [];
    
    if (storedSitesJson && storedSitesJson !== 'undefined' && storedSitesJson !== 'null') {
      try {
        localSites = JSON.parse(storedSitesJson);
      } catch (e) {
        console.error('[Migration] Error parsing sites:', e);
        localSites = [];
      }
    } else {
      localSites = SITES_DATA.map((s, idx) => ({
        id: s.codigo,
        name: s.site,
        siteCode: s.codigo,
        tipologia: s.tipologia,
        region: s.region as any,
        zona: s.zona,
        departamento: s.departamento,
        provincia: s.provincia,
        distrito: s.distrito,
        address: s.direccion,
        lat: s.latitud,
        lng: s.longitud,
        isPrincipal: null,
        parentSiteId: null,
      }));
    }
    
    console.log(`[Migration] Found ${localSites.length} local sites`);
    
    const siteInserts = localSites.map(site => mapSiteFromApp(site));
    const siteChunks = chunkArray(siteInserts, 500);
    
    for (const [index, chunk] of siteChunks.entries()) {
      console.log(`[Migration] Processing sites chunk ${index + 1}/${siteChunks.length}...`);
      const result = await upsertBulkSites(chunk) as { data: any[] | null; error: any };
      if (result.error) {
        console.error(`[Migration] ❌ Error in sites chunk ${index + 1}:`, result.error.message);
        stats.errors.push({ entity: 'sites', error: result.error });
      } else if (result.data && Array.isArray(result.data)) {
        stats.sites += result.data.length;
      }
    }
    
    console.log(`[Migration] ✅ Migrated ${stats.sites} sites`);
  } catch (err) {
    console.error('[Migration] ❌ Exception migrating sites:', err);
    stats.errors.push({ entity: 'sites', error: err });
  }

  onProgress?.('Migrando técnicos...', ++currentStep, totalSteps);
  console.log('[Migration] 📋 Step 3/8: Migrating tecnicos...');
  
  try {
    const crewSeeds = generateCrews();
    const tecnicos: TecnicoInsert[] = [];
    
    crewSeeds.forEach((crew, idx) => {
      crew.skills.forEach((skill, skillIdx) => {
        const tecnicoName = `Técnico ${idx + 1}-${skillIdx + 1}`;
        tecnicos.push({
          dni: `${10000000 + idx * 10 + skillIdx}`,
          nombre: tecnicoName,
          telefono: null,
          correo: `${tecnicoName.toLowerCase().replace(/\s/g, '')}@tecnico.com`,
          especialidad: skill,
          activo: true,
        });
      });
    });
    
    const tecnicosChunks = chunkArray(tecnicos, 500);
    
    for (const [index, chunk] of tecnicosChunks.entries()) {
      console.log(`[Migration] Processing tecnicos chunk ${index + 1}/${tecnicosChunks.length}...`);
      const result = await upsertBulkTecnicos(chunk);
      if (result.error) {
        console.error(`[Migration] ❌ Error in tecnicos chunk ${index + 1}:`, result.error.message);
        stats.errors.push({ entity: 'tecnicos', error: result.error });
      } else {
        stats.tecnicos += result.data?.length || 0;
      }
    }
    
    console.log(`[Migration] ✅ Migrated ${stats.tecnicos} tecnicos`);
  } catch (err) {
    console.error('[Migration] ❌ Exception migrating tecnicos:', err);
    stats.errors.push({ entity: 'tecnicos', error: err });
  }

  onProgress?.('Migrando cuadrillas...', ++currentStep, totalSteps);
  console.log('[Migration] 📋 Step 4/8: Migrating cuadrillas...');
  
  try {
    const storedCrewsJson = await AsyncStorage.getItem('crews');
    let localCrews: Crew[] = [];
    
    if (storedCrewsJson && storedCrewsJson !== 'undefined' && storedCrewsJson !== 'null') {
      try {
        localCrews = JSON.parse(storedCrewsJson);
      } catch (e) {
        console.error('[Migration] Error parsing crews:', e);
        localCrews = [];
      }
    } else {
      const crewSeeds = generateCrews();
      localCrews = crewSeeds.map((seed) => ({
        id: seed.id,
        name: seed.label,
        email: `${seed.id.toLowerCase().replace(/[^a-z0-9]/g, '')}@cuadrilla.com`,
        members: [`Miembro 1 ${seed.label}`, `Miembro 2 ${seed.label}`],
        currentLocation: { lat: seed.lastLocation.lat, lng: seed.lastLocation.lng },
        lastLocationUpdate: new Date(),
        status: seed.status === "AVAILABLE" ? "disponible" : seed.status === "BUSY" ? "ocupado" : "fuera_servicio",
        zone: seed.zone,
        type: seed.type,
        coverageAreas: [seed.department],
        assignedTicketIds: [],
        inventory: seed.inventory.map(i => i.description),
        interzonal: false,
        workload: seed.workload,
        affinity: { homeDepartment: seed.department, homeRegion: seed.zone },
        route: seed.route,
        inventoryItems: seed.inventory,
        skills: seed.skills,
        department: seed.department,
        base: seed.base,
      }));
    }
    
    console.log(`[Migration] Found ${localCrews.length} local crews`);
    
    const cuadrillaInserts = localCrews.map(crew => mapCuadrillaFromApp(crew));
    const cuadrillaChunks = chunkArray(cuadrillaInserts, 500);
    
    for (const [index, chunk] of cuadrillaChunks.entries()) {
      console.log(`[Migration] Processing cuadrillas chunk ${index + 1}/${cuadrillaChunks.length}...`);
      const result = await upsertBulkCuadrillas(chunk) as { data: any[] | null; error: any };
      if (result.error) {
        console.error(`[Migration] ❌ Error in cuadrillas chunk ${index + 1}:`, result.error.message);
        stats.errors.push({ entity: 'cuadrillas', error: result.error });
      } else if (result.data && Array.isArray(result.data)) {
        stats.cuadrillas += result.data.length;
      }
    }
    
    console.log(`[Migration] ✅ Migrated ${stats.cuadrillas} cuadrillas`);
  } catch (err) {
    console.error('[Migration] ❌ Exception migrating cuadrillas:', err);
    stats.errors.push({ entity: 'cuadrillas', error: err });
  }

  onProgress?.('Migrando relaciones cuadrilla-técnico...', ++currentStep, totalSteps);
  console.log('[Migration] 📋 Step 5/8: Migrating cuadrilla_tecnico...');
  
  try {
    console.log('[Migration] ⏭️ Skipping cuadrilla_tecnico migration (demo data)');
    stats.cuadrillaTecnico = 0;
  } catch (err) {
    console.error('[Migration] ❌ Exception migrating cuadrilla_tecnico:', err);
    stats.errors.push({ entity: 'cuadrilla_tecnico', error: err });
  }

  onProgress?.('Migrando tickets...', ++currentStep, totalSteps);
  console.log('[Migration] 📋 Step 6/8: Migrating tickets...');
  
  try {
    const storedTicketsJson = await AsyncStorage.getItem('tickets');
    let localTickets: Ticket[] = [];
    if (storedTicketsJson && storedTicketsJson !== 'undefined' && storedTicketsJson !== 'null') {
      try {
        localTickets = JSON.parse(storedTicketsJson);
      } catch (e) {
        console.error('[Migration] Error parsing tickets:', e);
      }
    }
    
    console.log(`[Migration] Found ${localTickets.length} local tickets`);
    
    const ticketInsertsWithSiteIds: any[] = [];
    
    for (const ticket of localTickets) {
      const siteResult = await getSiteByCodigo(ticket.siteId);
      if (siteResult.error || !siteResult.data) {
        console.warn(`[Migration] ⚠️ Site not found for ticket ${ticket.id}, siteId: ${ticket.siteId}`);
        continue;
      }
      
      const ticketInsert = mapTicketFromApp(ticket);
      ticketInsertsWithSiteIds.push(ticketInsert);
    }
    
    const ticketChunks = chunkArray(ticketInsertsWithSiteIds, 500);
    
    for (const [index, chunk] of ticketChunks.entries()) {
      console.log(`[Migration] Processing tickets chunk ${index + 1}/${ticketChunks.length}...`);
      const result = await upsertBulkTickets(chunk) as { data: any[] | null; error: any };
      if (result.error) {
        console.error(`[Migration] ❌ Error in tickets chunk ${index + 1}:`, result.error.message);
        stats.errors.push({ entity: 'tickets', error: result.error });
      } else if (result.data && Array.isArray(result.data)) {
        stats.tickets += result.data.length;
      }
    }
    
    console.log(`[Migration] ✅ Migrated ${stats.tickets} tickets`);
  } catch (err) {
    console.error('[Migration] ❌ Exception migrating tickets:', err);
    stats.errors.push({ entity: 'tickets', error: err });
  }

  onProgress?.('Migrando asignaciones...', ++currentStep, totalSteps);
  console.log('[Migration] 📋 Step 7/8: Migrating ticket_asignacion...');
  
  try {
    const storedDispatchesJson = await AsyncStorage.getItem('dispatches');
    let localDispatches: Dispatch[] = [];
    if (storedDispatchesJson && storedDispatchesJson !== 'undefined' && storedDispatchesJson !== 'null') {
      try {
        localDispatches = JSON.parse(storedDispatchesJson);
      } catch (e) {
        console.error('[Migration] Error parsing dispatches:', e);
      }
    }
    
    console.log(`[Migration] Found ${localDispatches.length} local dispatches`);
    
    const asignacionInserts: any[] = [];
    
    for (const dispatch of localDispatches) {
      const ticketResult = await getTicketBySource(dispatch.ticketId);
      if (ticketResult.error || !ticketResult.data) {
        console.warn(`[Migration] ⚠️ Ticket not found for dispatch ${dispatch.id}, ticketId: ${dispatch.ticketId}`);
        continue;
      }
      
      const crewName = dispatch.crewId.replace('crew-', '').replace(/-/g, ' ');
      const cuadrillaResult = await getCuadrillaByNombre(crewName);
      if (cuadrillaResult.error || !cuadrillaResult.data) {
        console.warn(`[Migration] ⚠️ Cuadrilla not found for dispatch ${dispatch.id}, crewId: ${dispatch.crewId}`);
        continue;
      }
      
      const asignacionInsert = mapTicketAsignacionFromApp(dispatch, ticketResult.data.id, cuadrillaResult.data.id);
      asignacionInserts.push(asignacionInsert);
    }
    
    const asignacionChunks = chunkArray(asignacionInserts, 500);
    
    for (const [index, chunk] of asignacionChunks.entries()) {
      console.log(`[Migration] Processing asignaciones chunk ${index + 1}/${asignacionChunks.length}...`);
      const result = await upsertBulkTicketAsignaciones(chunk) as { data: any[] | null; error: any };
      if (result.error) {
        console.error(`[Migration] ❌ Error in asignaciones chunk ${index + 1}:`, result.error.message);
        stats.errors.push({ entity: 'ticket_asignacion', error: result.error });
      } else if (result.data && Array.isArray(result.data)) {
        stats.ticketAsignacion += result.data.length;
      }
    }
    
    console.log(`[Migration] ✅ Migrated ${stats.ticketAsignacion} asignaciones`);
  } catch (err) {
    console.error('[Migration] ❌ Exception migrating ticket_asignacion:', err);
    stats.errors.push({ entity: 'ticket_asignacion', error: err });
  }

  onProgress?.('Finalizando...', ++currentStep, totalSteps);
  console.log('[Migration] 📋 Step 8/8: Finalizing...');
  
  await AsyncStorage.setItem('migration-completed-at', new Date().toISOString());
  
  console.log('[Migration] ✅ Migration complete!');
  console.log('[Migration] 📊 Summary:');
  console.log(`  - Catalogo Descripcion: ${stats.catalogoDescripcion}`);
  console.log(`  - Catalogo Tipo Falla: ${stats.catalogoTipoFalla}`);
  console.log(`  - Sites: ${stats.sites}`);
  console.log(`  - Tecnicos: ${stats.tecnicos}`);
  console.log(`  - Cuadrillas: ${stats.cuadrillas}`);
  console.log(`  - Cuadrilla-Tecnico: ${stats.cuadrillaTecnico}`);
  console.log(`  - Tickets: ${stats.tickets}`);
  console.log(`  - Ticket Asignaciones: ${stats.ticketAsignacion}`);
  console.log(`  - Errors: ${stats.errors.length}`);
  
  return stats;
}

export async function getMigrationStatus(): Promise<{ completed: boolean; completedAt: Date | null }> {
  try {
    const completedAt = await AsyncStorage.getItem('migration-completed-at');
    return {
      completed: !!completedAt,
      completedAt: completedAt ? new Date(completedAt) : null,
    };
  } catch (error) {
    console.error('[Migration] ❌ Error getting migration status:', error);
    return { completed: false, completedAt: null };
  }
}
