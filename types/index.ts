export type Priority = "P0" | "P1" | "P2" | "P3";

export type TicketStatus = "recepcion" | "asignar" | "arribo" | "neutralizar" | "validar" | "cierre";

export type EvidenceType = "photo_before" | "photo_after" | "signature" | "checklist" | "geo" | "other";

export type HSEPermitType = 
  | "CORTE ENERGIA" 
  | "ENERGIA" 
  | "MBTS" 
  | "PEXT - Atenuacion de FO" 
  | "PEXT - Corte de FO" 
  | "PEXT - Falsa Averia" 
  | "RADIO" 
  | "RED - TRANSPORTE DE RED" 
  | "SEGURIDAD" 
  | "SISTEMA ELECTRICO" 
  | "TX";

export type HSEPermitStatus = "pendiente" | "aprobado" | "rechazado";

export type UserRole = "tecnico" | "backoffice" | "jefe_zona" | "hse" | "admin";

export type UserType = "oficina" | "campo";

export type KPIScope = "global" | "region" | "zona";

export interface Site {
  id: string;
  name: string;
  siteCode: string;
  tipologia?: string;
  region: string;
  zona: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  address?: string;
  lat: number;
  lng: number;
  isPrincipal: boolean | null;
  parentSiteId: string | null;
}

export interface Ticket {
  id: string;
  itsmRef: string | null;
  priority: Priority;
  status: TicketStatus;
  siteId: string;
  isDependent: boolean;
  openedAt: Date;
  neutralizedAt: Date | null;
  closedAt: Date | null;
  slaDeadlineAt: Date | null;
  exclusionCause: string | null;
  recurrenceFlag: boolean;
  description?: string;
  interventionType?: HSEPermitType | null;
  reqA?: boolean;
  reqB?: boolean;
  arrivedAt?: Date | null;
  validatedAt?: Date | null;
}

export interface Dispatch {
  id: string;
  ticketId: string;
  crewId: string;
  scheduledAt: Date;
  windowStart: Date;
  windowEnd: Date;
  eta: Date | null;
  arrivedAt: Date | null;
  departedAt: Date | null;
  arrivalWindowOk: boolean | null;
  arrivalGeo: { lat: number; lng: number } | null;
  reasonLate: string | null;
}

export interface EvidenceBundle {
  id: string;
  ticketId: string;
  valid: boolean;
  validatedAt: Date | null;
  validatorUserId: string | null;
}

export interface EvidenceItem {
  id: string;
  bundleId: string;
  type: EvidenceType;
  url: string;
  exif: ExifData | null;
  geo: { lat: number; lng: number } | null;
  checklist: ChecklistData | null;
  createdAt: Date;
  hash: string;
}

export interface ExifData {
  timestamp: Date;
  gps?: { lat: number; lng: number };
  [key: string]: any;
}

export interface ChecklistData {
  tipo_falla: string;
  accion_realizada: string;
  repuestos_usados: string[];
  pruebas_post: string;
  observaciones: string;
}

export interface HSEPermit {
  id: string;
  ticketId: string;
  type: HSEPermitType;
  status: HSEPermitStatus;
  issuedAt: Date;
  approvedAt: Date | null;
  payload: any;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  userType: UserType;
  email: string;
  phone: string | null;
  zone: string | null;
  crewId: string | null;
  status: string;
}

export interface Crew {
  id: string;
  name: string;
  email: string;
  members: string[];
  currentLocation: { lat: number; lng: number } | null;
  lastLocationUpdate: Date | null;
  status: "disponible" | "ocupado" | "fuera_servicio";
  zone: string;
  type?: "REGULAR" | "CHOQUE";
  categoria?: string;
  coverageAreas?: string[];
  assignedTicketIds?: string[];
  inventory?: string[];
  interzonal?: boolean;
  workload?: { openAssignedTickets: number };
  affinity?: { homeDepartment: string; homeRegion: string };
  route?: { etaMinBaseline: number; distKmBaseline: number };
  inventoryItems?: { sku: string; description: string; qty: number }[];
  skills?: string[];
  department?: string;
  base?: string;
}

export interface RouteInfo {
  distanceKm: number;
  durationMinutes: number;
  trafficFactor: number;
  roadQuality: "excelente" | "buena" | "regular" | "mala";
  alternativeRoutes: number;
}

export interface AssignmentScore {
  crewId: string;
  totalScore: number;
  skillsScore: number;
  etaScore: number;
  routeScore: number;
  workloadScore: number;
  zoneAffinityScore: number;
  typeScore: number;
  inventoryScore: number;
  reasoning: string;
}

export interface KPISnapshot {
  id: string;
  date: Date;
  scope: KPIScope;
  priority: Priority | "ALL";
  slaCompliance: number;
  arrivalWindow: number;
  evidenceValid: number;
  recurrence30: number;
  recurrence60: number;
  mtnMinutes: number;
}

export interface SyncQueueItem {
  id: string;
  type: "arrival" | "departure" | "evidence" | "neutralize" | "hse_request" | "hse_approve";
  ticketId: string;
  payload: any;
  createdAt: Date;
  retries: number;
  lastError: string | null;
}
