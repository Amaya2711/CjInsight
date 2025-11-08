export type CuadrillaTecnicoDB = {
  cuadrilla_id: number;
  tecnico_id: number;
  rol: string | null;
};

export type CuadrillaTecnicoInsert = CuadrillaTecnicoDB;

export async function listCuadrillaTecnicos() {
  console.warn('[CuadrillaTecnico] Table cuadrilla_tecnico does not exist in new database');
  return { data: [], error: null };
}

export async function getCuadrillaTecnicosByCuadrillaId(cuadrillaId: number) {
  console.warn('[CuadrillaTecnico] Table cuadrilla_tecnico does not exist in new database');
  return { data: [], error: null };
}

export async function getCuadrillaTecnicosByTecnicoId(tecnicoId: number) {
  console.warn('[CuadrillaTecnico] Table cuadrilla_tecnico does not exist in new database');
  return { data: [], error: null };
}

export async function createCuadrillaTecnico(relation: CuadrillaTecnicoInsert) {
  console.warn('[CuadrillaTecnico] Table cuadrilla_tecnico does not exist in new database');
  return { data: null, error: new Error('cuadrilla_tecnico table not available') };
}

export async function deleteCuadrillaTecnico(cuadrillaId: number, tecnicoId: number) {
  console.warn('[CuadrillaTecnico] Table cuadrilla_tecnico does not exist in new database');
  return { data: null, error: null };
}

export async function upsertBulkCuadrillaTecnicos(relations: CuadrillaTecnicoInsert[]) {
  console.warn('[CuadrillaTecnico] Table cuadrilla_tecnico does not exist in new database');
  return { data: [], error: null };
}
