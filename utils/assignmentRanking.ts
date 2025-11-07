import type { Crew, Site, Ticket, Priority, AssignmentScore, RouteInfo } from "@/types";

const SKILL_MAPPING: Record<string, string[]> = {
  "CORTE ENERGIA": [
    "Revisión de corte de energía",
    "Conmutación a grupo electrógeno",
    "Sistema eléctrico y tableros",
    "Respuesta rápida multi-tecnología"
  ],
  "ENERGIA": [
    "Revisión de corte de energía",
    "Conmutación a grupo electrógeno",
    "Sistema eléctrico y tableros",
    "Puesta a tierra y limpieza",
    "Respuesta rápida multi-tecnología"
  ],
  "SISTEMA ELECTRICO": [
    "Sistema eléctrico y tableros",
    "Puesta a tierra y limpieza",
    "Respuesta rápida multi-tecnología"
  ],
  "TX": [
    "Diagnóstico TX/Backhaul",
    "Alineación de radioenlace",
    "Pruebas BER/Ethernet",
    "Respuesta rápida multi-tecnología"
  ],
  "RED - TRANSPORTE DE RED": [
    "Diagnóstico TX/Backhaul",
    "Pruebas BER/Ethernet",
    "Respuesta rápida multi-tecnología"
  ],
  "RADIO": [
    "Alineación de radioenlace",
    "Trabajo en altura/arnés",
    "Respuesta rápida multi-tecnología"
  ],
  "PEXT - Corte de FO": [
    "Empalme/OTDR de fibra (PEXT)",
    "Reparación de conectores y patch cords",
    "Respuesta rápida multi-tecnología"
  ],
  "PEXT - Atenuacion de FO": [
    "Empalme/OTDR de fibra (PEXT)",
    "Reparación de conectores y patch cords",
    "Medición de potencia óptica",
    "Respuesta rápida multi-tecnología"
  ],
  "PEXT - Falsa Averia": [
    "Reparación de conectores y patch cords",
    "Medición de potencia óptica",
    "Respuesta rápida multi-tecnología"
  ],
  "SEGURIDAD": [
    "Verificación HSE",
    "Bloqueo/Etiquetado (LOTO)",
    "Trabajo en altura/arnés",
    "Respuesta rápida multi-tecnología"
  ],
  "MBTS": [
    "Trabajo en altura/arnés",
    "Alineación de radioenlace",
    "Respuesta rápida multi-tecnología"
  ],
};

const ZONE_DEPARTMENTS: Record<string, string[]> = {
  "LIMA": ["LIMA", "CALLAO"],
  "CENTRO": ["JUNIN", "HUANCAVELICA", "AYACUCHO", "PASCO", "HUANUCO"],
  "NORTE": ["PIURA", "LAMBAYEQUE", "LA LIBERTAD", "CAJAMARCA", "ANCASH"],
  "SUR": ["AREQUIPA", "MOQUEGUA", "TACNA", "CUSCO", "PUNO", "ICA"],
};

const SLA_HOURS: Record<Priority, { lima: number; departamentos: number }> = {
  P0: { lima: 2, departamentos: 5 },
  P1: { lima: 8, departamentos: 8 },
  P2: { lima: 24, departamentos: 24 },
  P3: { lima: 72, departamentos: 72 },
};

export function calculateSLADeadline(priority: Priority, departamento?: string): { slaHours: number; slaDeadline: Date } {
  const isLima = departamento?.toUpperCase().includes("LIMA") || false;
  const slaHours = isLima ? SLA_HOURS[priority].lima : SLA_HOURS[priority].departamentos;
  
  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + slaHours);
  
  return { slaHours, slaDeadline };
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateRouteInfo(
  crewLat: number,
  crewLng: number,
  siteLat: number,
  siteLng: number,
  siteDepartamento: string = "",
  crewZone: string = ""
): RouteInfo {
  const straightDistance = haversineDistance(crewLat, crewLng, siteLat, siteLng);
  
  const isUrban = siteDepartamento.toUpperCase().includes("LIMA");
  const urbanFactor = isUrban ? 1.4 : 1.6;
  const distanceKm = straightDistance * urbanFactor;
  
  let trafficFactor = 1.0;
  const hour = new Date().getHours();
  if (isUrban && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20))) {
    trafficFactor = 1.5;
  } else if (!isUrban && distanceKm > 100) {
    trafficFactor = 1.2;
  }
  
  let roadQuality: "excelente" | "buena" | "regular" | "mala" = "buena";
  if (!isUrban) {
    if (distanceKm > 200) {
      roadQuality = "regular";
    } else if (distanceKm > 300) {
      roadQuality = "mala";
    }
  } else {
    roadQuality = "excelente";
  }
  
  const baseSpeed = isUrban ? 30 : 60;
  const roadQualityFactor =
    roadQuality === "excelente" ? 1.0 :
    roadQuality === "buena" ? 0.9 :
    roadQuality === "regular" ? 0.7 :
    0.5;
  
  const effectiveSpeed = baseSpeed * roadQualityFactor;
  const durationMinutes = (distanceKm / effectiveSpeed) * 60 * trafficFactor;
  
  const alternativeRoutes = isUrban && distanceKm < 50 ? 3 : distanceKm < 100 ? 2 : 1;
  
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    durationMinutes: Math.round(durationMinutes),
    trafficFactor,
    roadQuality,
    alternativeRoutes,
  };
}

function calculateSkillsScore(
  crewSkills: string[] = [],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) return 50;
  
  const matchingSkills = crewSkills.filter((crewSkill) =>
    requiredSkills.some((reqSkill) => 
      crewSkill.toLowerCase().trim() === reqSkill.toLowerCase().trim() ||
      crewSkill.toLowerCase().includes(reqSkill.toLowerCase()) ||
      reqSkill.toLowerCase().includes(crewSkill.toLowerCase())
    )
  );
  
  if (matchingSkills.length === 0) return 0;
  
  const baseScore = (matchingSkills.length / requiredSkills.length) * 100;
  
  const hasMultiTech = crewSkills.some(skill => 
    skill.toLowerCase().includes("respuesta rápida multi-tecnología")
  );
  
  const bonusScore = hasMultiTech ? Math.min(20, (requiredSkills.length - matchingSkills.length) * 5) : 0;
  
  return Math.min(100, baseScore + bonusScore);
}

function calculateETAScore(durationMinutes: number, slaHours: number): number {
  const slaMinutes = slaHours * 60;
  const etaRatio = durationMinutes / slaMinutes;
  
  if (etaRatio <= 0.25) return 100;
  if (etaRatio <= 0.5) return 80;
  if (etaRatio <= 0.75) return 60;
  if (etaRatio <= 1.0) return 40;
  return 20;
}

function calculateRouteScore(routeInfo: RouteInfo): number {
  let score = 100;
  
  if (routeInfo.roadQuality === "mala") {
    score -= 40;
  } else if (routeInfo.roadQuality === "regular") {
    score -= 25;
  } else if (routeInfo.roadQuality === "buena") {
    score -= 10;
  }
  
  if (routeInfo.trafficFactor > 1.4) {
    score -= 20;
  } else if (routeInfo.trafficFactor > 1.2) {
    score -= 10;
  }
  
  if (routeInfo.alternativeRoutes >= 3) {
    score += 10;
  } else if (routeInfo.alternativeRoutes === 2) {
    score += 5;
  }
  
  if (routeInfo.distanceKm > 300) {
    score -= 20;
  } else if (routeInfo.distanceKm > 200) {
    score -= 15;
  } else if (routeInfo.distanceKm > 100) {
    score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

function calculateWorkloadScore(assignedTickets: number, maxTickets = 5): number {
  return Math.max(0, ((maxTickets - assignedTickets) / maxTickets) * 100);
}

function calculateZoneAffinityScore(
  crewZone: string,
  siteDepartamento: string = "",
  crewCoverageAreas: string[] = []
): number {
  const normalizedCrewZone = crewZone.toUpperCase();
  const normalizedDept = siteDepartamento.toUpperCase();
  
  if (crewCoverageAreas.some((area) => area.toUpperCase() === normalizedDept)) {
    return 100;
  }
  
  for (const [zone, departments] of Object.entries(ZONE_DEPARTMENTS)) {
    if (
      normalizedCrewZone.includes(zone) &&
      departments.some((dept) => normalizedDept.includes(dept))
    ) {
      return 80;
    }
  }
  
  if (normalizedCrewZone.includes("INTERZONAL")) {
    return 60;
  }
  
  return 40;
}

function calculateTypeScore(
  crewType: "REGULAR" | "CHOQUE" | undefined,
  priority: Priority,
  escalated: boolean = false
): number {
  if (escalated) {
    return crewType === "CHOQUE" ? 100 : 20;
  }
  return crewType === "REGULAR" ? 100 : 0;
}

function calculateInventoryScore(
  crewInventory: string[] = [],
  requiredParts: string[] = []
): number {
  if (requiredParts.length === 0) return 50;
  
  const availableParts = crewInventory.filter((part) =>
    requiredParts.some((req) => part.toLowerCase().includes(req.toLowerCase()))
  );
  
  return (availableParts.length / requiredParts.length) * 100;
}

export function rankCrewsForTicket(
  ticket: Ticket,
  site: Site,
  availableCrews: Crew[],
  requiredParts: string[] = [],
  escalated: boolean = false
): AssignmentScore[] {
  const requiredSkills = ticket.interventionType
    ? SKILL_MAPPING[ticket.interventionType] || []
    : [];
  
  const slaHours =
    site.departamento?.toUpperCase().includes("LIMA")
      ? SLA_HOURS[ticket.priority].lima
      : SLA_HOURS[ticket.priority].departamentos;
  
  const scores: AssignmentScore[] = availableCrews
    .filter((crew) => crew.status === "disponible" || crew.status === "ocupado")
    .filter((crew) => crew.currentLocation !== null)
    .map((crew) => {
      const routeInfo = calculateRouteInfo(
        crew.currentLocation!.lat,
        crew.currentLocation!.lng,
        site.lat,
        site.lng,
        site.departamento,
        crew.zone
      );
      
      const skillsScore = calculateSkillsScore(crew.skills, requiredSkills);
      const etaScore = calculateETAScore(routeInfo.durationMinutes, slaHours);
      const routeScore = calculateRouteScore(routeInfo);
      const workloadScore = calculateWorkloadScore(crew.assignedTicketIds?.length || 0);
      const zoneAffinityScore = calculateZoneAffinityScore(
        crew.zone,
        site.departamento,
        crew.coverageAreas
      );
      const typeScore = calculateTypeScore(crew.type, ticket.priority, escalated);
      const inventoryScore = calculateInventoryScore(crew.inventory, requiredParts);
      
      const WEIGHTS = {
        skills: 0.25,
        eta: 0.15,
        route: 0.20,
        workload: 0.15,
        zoneAffinity: 0.10,
        type: 0.10,
        inventory: 0.05,
      };
      
      const totalScore =
        skillsScore * WEIGHTS.skills +
        etaScore * WEIGHTS.eta +
        routeScore * WEIGHTS.route +
        workloadScore * WEIGHTS.workload +
        zoneAffinityScore * WEIGHTS.zoneAffinity +
        typeScore * WEIGHTS.type +
        inventoryScore * WEIGHTS.inventory;
      
      const matchedSkills = crew.skills?.filter((crewSkill) =>
        requiredSkills.some((reqSkill) => 
          crewSkill.toLowerCase().trim() === reqSkill.toLowerCase().trim() ||
          crewSkill.toLowerCase().includes(reqSkill.toLowerCase())
        )
      ) || [];
      
      const reasoning = [
        `Skills: ${skillsScore.toFixed(0)}% (${matchedSkills.length}/${requiredSkills.length} coincidencias)`,
        `ETA: ${routeInfo.durationMinutes}min (${etaScore.toFixed(0)}% del SLA)`,
        `Ruta: ${routeScore.toFixed(0)}% (${routeInfo.distanceKm}km, ${routeInfo.roadQuality}, tráfico x${routeInfo.trafficFactor.toFixed(1)})`,
        `Carga: ${crew.assignedTicketIds?.length || 0} tickets (${workloadScore.toFixed(0)}%)`,
        `Zona: ${zoneAffinityScore.toFixed(0)}% afinidad`,
        `Tipo: ${crew.type || "REGULAR"} (${typeScore.toFixed(0)}%)`,
        requiredParts.length > 0 ? `Inventario: ${inventoryScore.toFixed(0)}%` : null,
      ]
        .filter(Boolean)
        .join(" | ");
      
      return {
        crewId: crew.id,
        totalScore: Math.round(totalScore * 10) / 10,
        skillsScore: Math.round(skillsScore * 10) / 10,
        etaScore: Math.round(etaScore * 10) / 10,
        routeScore: Math.round(routeScore * 10) / 10,
        workloadScore: Math.round(workloadScore * 10) / 10,
        zoneAffinityScore: Math.round(zoneAffinityScore * 10) / 10,
        typeScore: Math.round(typeScore * 10) / 10,
        inventoryScore: Math.round(inventoryScore * 10) / 10,
        reasoning,
      };
    });
  
  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

export function getBestCrew(
  ticket: Ticket,
  site: Site,
  availableCrews: Crew[],
  requiredParts: string[] = [],
  escalated: boolean = false
): AssignmentScore | null {
  const regularCrews = availableCrews.filter(c => c.type !== "CHOQUE");
  
  if (!escalated && regularCrews.length > 0) {
    const regularRankings = rankCrewsForTicket(ticket, site, regularCrews, requiredParts, false);
    if (regularRankings.length > 0) {
      const bestRegular = regularRankings[0];
      const slaMinutes = (site.departamento?.toUpperCase().includes("LIMA")
        ? SLA_HOURS[ticket.priority].lima
        : SLA_HOURS[ticket.priority].departamentos) * 60;
      
      const crew = regularCrews.find(c => c.id === bestRegular.crewId);
      if (crew?.currentLocation) {
        const routeInfo = calculateRouteInfo(
          crew.currentLocation.lat,
          crew.currentLocation.lng,
          site.lat,
          site.lng,
          site.departamento,
          crew.zone
        );
        
        if (routeInfo.durationMinutes <= slaMinutes * 0.5) {
          return bestRegular;
        }
      }
    }
  }
  
  const rankings = rankCrewsForTicket(ticket, site, availableCrews, requiredParts, true);
  return rankings.length > 0 ? rankings[0] : null;
}
