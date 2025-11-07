import type {
  ChecklistData,
  EvidenceBundle,
  EvidenceItem,
  ExifData,
  HSEPermit,
  Priority,
  Site,
  Ticket,
} from "@/types";

const GEOFENCE_RADIUS_METERS = 200;

export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function isInsideGeofence(
  point: { lat: number; lng: number },
  site: Site,
  radiusM: number = GEOFENCE_RADIUS_METERS
): boolean {
  const distance = calculateDistance(point.lat, point.lng, site.lat, site.lng);
  return distance <= radiusM;
}

export function validateExif(exif: ExifData | null): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!exif) {
    errors.push("No hay datos EXIF");
    return { valid: false, errors };
  }

  if (!exif.timestamp) {
    errors.push("Falta timestamp en EXIF");
  }

  if (!exif.gps || !exif.gps.lat || !exif.gps.lng) {
    errors.push("Falta ubicación GPS en EXIF");
  }

  return { valid: errors.length === 0, errors };
}

export function validateChecklist(checklist: ChecklistData | null): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!checklist) {
    errors.push("Checklist no completado");
    return { valid: false, errors };
  }

  if (!checklist.tipo_falla || checklist.tipo_falla.trim() === "") {
    errors.push("Falta tipo de falla");
  }

  if (!checklist.accion_realizada || checklist.accion_realizada.trim() === "") {
    errors.push("Falta acción realizada");
  }

  if (!checklist.pruebas_post || checklist.pruebas_post.trim() === "") {
    errors.push("Falta pruebas post-intervención");
  }

  return { valid: errors.length === 0, errors };
}

export function validateEvidence(
  evidenceItems: EvidenceItem[],
  site: Site,
  geofenceRadius: number = 300
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  const photoBefore = evidenceItems.find((item) => item.type === "photo_before");
  const photoAfter = evidenceItems.find((item) => item.type === "photo_after");
  const checklist = evidenceItems.find((item) => item.type === "checklist");

  if (!photoBefore) {
    errors.push("Falta foto ANTES");
  } else if (photoBefore.geo) {
    if (!isInsideGeofence(photoBefore.geo, site, geofenceRadius)) {
      errors.push("Foto ANTES tomada fuera de la geocerca");
    }
  }

  if (!photoAfter) {
    errors.push("Falta foto DESPUÉS");
  } else if (photoAfter.geo) {
    if (!isInsideGeofence(photoAfter.geo, site, geofenceRadius)) {
      errors.push("Foto DESPUÉS tomada fuera de la geocerca");
    }
  }

  if (photoBefore && photoAfter && photoBefore.exif && photoAfter.exif) {
    const beforeTime = new Date(photoBefore.exif.timestamp).getTime();
    const afterTime = new Date(photoAfter.exif.timestamp).getTime();
    if (afterTime <= beforeTime) {
      errors.push("Foto DESPUÉS debe ser posterior a foto ANTES");
    }
  }

  if (!checklist) {
    errors.push("Falta checklist");
  } else {
    const checklistValidation = validateChecklist(checklist.checklist);
    if (!checklistValidation.valid) {
      errors.push(`Checklist: ${checklistValidation.errors.join(", ")}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function requiresHSE(ticket: Ticket): boolean {
  return ticket.interventionType !== null && ticket.interventionType !== undefined;
}

export function canNeutralize(
  ticket: Ticket,
  evidenceBundle: EvidenceBundle | undefined,
  evidenceItems: EvidenceItem[],
  hsePermits: HSEPermit[],
  site: Site
): {
  canNeutralize: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (ticket.status === "neutralizado" || ticket.status === "cerrado") {
    reasons.push("El ticket ya está neutralizado o cerrado");
    return { canNeutralize: false, reasons };
  }

  if (requiresHSE(ticket)) {
    const approvedPermit = hsePermits.find(
      (p) => p.ticketId === ticket.id && p.status === "aprobado"
    );
    if (!approvedPermit) {
      reasons.push("Se requiere permiso HSE aprobado");
    }
  }

  if (!evidenceBundle) {
    reasons.push("No hay bundle de evidencia");
    return { canNeutralize: false, reasons };
  }

  const evidenceValidation = validateEvidence(evidenceItems, site);
  if (!evidenceValidation.valid) {
    reasons.push(...evidenceValidation.errors);
  }

  return { canNeutralize: reasons.length === 0, reasons };
}

export function calculateSLAMinutes(openedAt: Date, neutralizedAt: Date): number {
  return Math.floor((neutralizedAt.getTime() - openedAt.getTime()) / (1000 * 60));
}

export function calculateSLARemaining(ticket: Ticket): {
  remainingMinutes: number;
  isOverdue: boolean;
} {
  if (!ticket.slaDeadlineAt) {
    return { remainingMinutes: 0, isOverdue: false };
  }

  const now = new Date();
  const deadline = new Date(ticket.slaDeadlineAt);
  const remainingMs = deadline.getTime() - now.getTime();
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));

  return {
    remainingMinutes: Math.max(0, remainingMinutes),
    isOverdue: remainingMinutes < 0,
  };
}

export function formatSLATime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function getSLAHoursByPriority(priority: Priority, zona?: string): number {
  const zonaUpper = zona?.toUpperCase() || '';
  const isLima = zonaUpper === 'CENTRO' || zonaUpper === 'NORTE' || zonaUpper === 'SUR';
  
  switch (priority) {
    case 'P0':
      return isLima ? 2 : 4;
    case 'P1':
      return 8;
    case 'P2':
      return 24;
    case 'P3':
      return 72;
    default:
      return 24;
  }
}

export function calculateSLADeadline(openedAt: Date, priority: Priority, zona?: string): Date {
  const slaHours = getSLAHoursByPriority(priority, zona);
  const deadline = new Date(openedAt);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
}
