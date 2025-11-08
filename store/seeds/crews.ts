export type CrewSeed = {
  id: string;
  label: string;
  type: "REGULAR" | "CHOQUE";
  zone: "LIMA" | "NORTE" | "CENTRO" | "SUR" | "ORIENTE";
  department: string;
  base: string;
  lastLocation: { lat: number; lng: number; ts?: string };
  skills: string[];
  status: "AVAILABLE" | "BUSY" | "OFF";
  route: { etaMinBaseline: number; distKmBaseline: number };
  workload: { openAssignedTickets: number };
  inventory: { sku: string; description: string; qty: number }[];
};

export const ZONES = ["LIMA", "NORTE", "CENTRO", "SUR", "ORIENTE"] as const;

const INVENTORY_CATALOG = [
  { sku: "RECT-48V",  description: "Rectificador 48V" },
  { sku: "BATT-12V",  description: "Batería 12V" },
  { sku: "GE-OIL",    description: "Aceite grupo electrógeno" },
  { sku: "FAN-AC",    description: "Ventilador A/C" },
  { sku: "SFP-10G",   description: "Transceiver 10G" },
  { sku: "FIB-200M",  description: "Patch cord fibra 200m" },
  { sku: "MIC-ANT",   description: "Antena microondas" },
  { sku: "ATS-KIT",   description: "Kit ATS" },
  { sku: "PDU-1U",    description: "PDU 1U" },
];

function seedNum(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pickMany<T>(arr: T[], k: number, seed: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  
  for (let i = 0; i < arr.length && out.length < k; i++) {
    const idx = (seed + i * 17 + (seed >> (i % 8))) % arr.length;
    if (!used.has(idx)) {
      out.push(arr[idx]);
      used.add(idx);
    }
  }
  
  while (out.length < k) {
    const idx = (seed + out.length * 23) % arr.length;
    if (!used.has(idx)) {
      out.push(arr[idx]);
      used.add(idx);
    }
  }
  
  return out;
}

type CrewData = {
  id: string;
  label: string;
  type: "CHOQUE" | "REGULAR";
  zone: "LIMA" | "NORTE" | "CENTRO" | "SUR" | "ORIENTE";
  department: string;
  base: string;
  lat: number;
  lng: number;
  skill1: string;
  skill2: string;
  skill3?: string;
};

const CREW_DATA: CrewData[] = [
  { id: "1", label: "CQ-LIM-REG-01 | Miraflores", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Miraflores", lat: -12.121011, lng: -77.036997, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "2", label: "CQ-LIM-REG-02 | San Isidro", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Isidro", lat: -12.0979, lng: -77.019058, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "3", label: "CQ-LIM-REG-03 | San Borja", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Borja", lat: -12.087419, lng: -77.004827, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "4", label: "CQ-LIM-REG-04 | Santiago de Surco", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Santiago de Surco", lat: -12.089029, lng: -76.9733, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "5", label: "CQ-LIM-REG-05 | Ate - Santa Clara", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Ate - Santa Clara", lat: -12.019528, lng: -76.884691, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "6", label: "CQ-LIM-REG-06 | Ate - Vitarte", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Ate - Vitarte", lat: -12.063282, lng: -76.964976, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "7", label: "CQ-LIM-REG-07 | La Molina", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "La Molina", lat: -12.091709, lng: -76.950644, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "8", label: "CQ-LIM-REG-08 | SJL", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Juan de Lurigancho", lat: -12.016537, lng: -76.998987, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "9", label: "CQ-LIM-REG-09 | San Miguel", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Miguel", lat: -12.076833, lng: -77.082725, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "10", label: "CQ-LIM-REG-10 | Jesús María", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Jesús María", lat: -12.079289, lng: -77.038221, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "11", label: "CQ-LIM-REG-11 | Surquillo", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Surquillo", lat: -12.112626, lng: -76.998724, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "12", label: "CQ-LIM-REG-12 | Chorrillos", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Chorrillos", lat: -12.196722, lng: -77.01181, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "13", label: "CQ-LIM-REG-13 | La Victoria", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "La Victoria", lat: -12.065474, lng: -77.013636, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "14", label: "CQ-LIM-REG-14 | Lince", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Lince", lat: -12.08914, lng: -77.038044, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "15", label: "CQ-LIM-REG-15 | Breña", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Breña", lat: -12.066444, lng: -77.050028, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "16", label: "CQ-LIM-REG-16 | Rímac", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Rímac", lat: -12.040944, lng: -77.025611, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "17", label: "CQ-LIM-REG-17 | Punta Negra", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Punta Negra", lat: -12.3655, lng: -76.786828, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "18", label: "CQ-LIM-REG-18 | San Bartolo", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Bartolo", lat: -12.390107, lng: -76.779085, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "19", label: "CQ-LIM-REG-19 | Cieneguilla", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Cieneguilla", lat: -12.111583, lng: -76.812282, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "20", label: "CQ-LIM-REG-20 | El Agustino", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "El Agustino", lat: -12.033053, lng: -76.983442, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "21", label: "CQ-LIM-REG-21 | Santa Anita", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Santa Anita", lat: -12.056643, lng: -76.970777, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "22", label: "CQ-LIM-REG-22 | Villa El Salvador", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Villa El Salvador", lat: -12.197704, lng: -76.964574, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "23", label: "CQ-LIM-REG-23 | SJM", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Juan de Miraflores", lat: -12.147597, lng: -76.981824, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "24", label: "CQ-LIM-REG-24 | Comas", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Comas", lat: -11.936228, lng: -77.065408, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "25", label: "CQ-LIM-REG-25 | Los Olivos", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Los Olivos", lat: -11.965198, lng: -77.066601, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "26", label: "CQ-LIM-REG-26 | Independencia", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Independencia", lat: -11.993826, lng: -77.062044, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "27", label: "CQ-LIM-REG-27 | Puente Piedra", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Puente Piedra", lat: -11.864306, lng: -77.074031, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "28", label: "CQ-LIM-REG-28 | Ancón", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Ancón", lat: -11.76821, lng: -77.162026, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "29", label: "CQ-LIM-REG-29 | La Punta", type: "REGULAR", zone: "LIMA", department: "CALLAO", base: "La Punta", lat: -12.07194, lng: -77.16225, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "30", label: "CQ-LIM-REG-30 | Chancay/COSCO", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Chancay/COSCO", lat: -11.583905, lng: -77.258014, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "31", label: "CQ-LIM-REG-31 | Miraflores", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Miraflores", lat: -12.121011, lng: -77.036997, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "32", label: "CQ-LIM-REG-32 | San Isidro", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Isidro", lat: -12.0979, lng: -77.019058, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "33", label: "CQ-LIM-REG-33 | San Borja", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Borja", lat: -12.087419, lng: -77.004827, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "34", label: "CQ-LIM-REG-34 | Santiago de Surco", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Santiago de Surco", lat: -12.089029, lng: -76.9733, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "35", label: "CQ-LIM-REG-35 | Ate - Santa Clara", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Ate - Santa Clara", lat: -12.019528, lng: -76.884691, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "36", label: "CQ-LIM-REG-36 | Ate - Vitarte", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Ate - Vitarte", lat: -12.063282, lng: -76.964976, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "37", label: "CQ-LIM-REG-37 | La Molina", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "La Molina", lat: -12.091709, lng: -76.950644, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "38", label: "CQ-LIM-REG-38 | SJL", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Juan de Lurigancho", lat: -12.016537, lng: -76.998987, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "39", label: "CQ-LIM-REG-39 | San Miguel", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "San Miguel", lat: -12.076833, lng: -77.082725, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "40", label: "CQ-LIM-REG-40 | Jesús María", type: "REGULAR", zone: "LIMA", department: "LIMA", base: "Jesús María", lat: -12.079289, lng: -77.038221, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "41", label: "CQ-LIM-CHOQUE-01 | Miraflores", type: "CHOQUE", zone: "LIMA", department: "LIMA", base: "Miraflores", lat: -12.121011, lng: -77.036997, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "42", label: "CQ-LIM-CHOQUE-02 | San Isidro", type: "CHOQUE", zone: "LIMA", department: "LIMA", base: "San Isidro", lat: -12.0979, lng: -77.019058, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "43", label: "CQ-LIM-CHOQUE-03 | San Borja", type: "CHOQUE", zone: "LIMA", department: "LIMA", base: "San Borja", lat: -12.087419, lng: -77.004827, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "44", label: "CQ-LIM-CHOQUE-04 | Santiago de Surco", type: "CHOQUE", zone: "LIMA", department: "LIMA", base: "Santiago de Surco", lat: -12.089029, lng: -76.9733, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "45", label: "CQ-CEN-REG-01 | Ica Centro", type: "REGULAR", zone: "CENTRO", department: "ICA", base: "Ica Centro", lat: -14.075452, lng: -75.739689, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "46", label: "CQ-CEN-REG-02 | Pisco/Paracas", type: "REGULAR", zone: "CENTRO", department: "ICA", base: "Pisco/Paracas", lat: -13.835957, lng: -76.254337, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "47", label: "CQ-CEN-REG-03 | Santa Cruz (Cerro Muña)", type: "REGULAR", zone: "CENTRO", department: "ICA", base: "Santa Cruz (Cerro Muña)", lat: -14.559111, lng: -75.247417, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "48", label: "CQ-CEN-REG-04 | Marcona", type: "REGULAR", zone: "CENTRO", department: "ICA", base: "Marcona", lat: -15.24425, lng: -75.1055, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "49", label: "CQ-CEN-REG-05 | Huancayo Centro", type: "REGULAR", zone: "CENTRO", department: "JUNÍN", base: "Huancayo Centro", lat: -12.068997, lng: -75.210564, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "50", label: "CQ-CEN-REG-06 | Pichanaki", type: "REGULAR", zone: "CENTRO", department: "JUNÍN", base: "Pichanaki", lat: -10.924695, lng: -74.876278, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "51", label: "CQ-CEN-REG-07 | Río Negro", type: "REGULAR", zone: "CENTRO", department: "JUNÍN", base: "Río Negro", lat: -11.0231, lng: -74.736517, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "52", label: "CQ-CEN-REG-08 | Villa Rica", type: "REGULAR", zone: "CENTRO", department: "PASCO", base: "Villa Rica", lat: -10.649861, lng: -75.292639, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "53", label: "CQ-CEN-REG-09 | Oxapampa/Churumazú", type: "REGULAR", zone: "CENTRO", department: "PASCO", base: "Oxapampa/Churumazú", lat: -10.7762, lng: -75.3435, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "54", label: "CQ-CEN-REG-10 | Tingo María", type: "REGULAR", zone: "CENTRO", department: "HUÁNUCO", base: "Tingo María", lat: -9.303183, lng: -76.003883, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "55", label: "CQ-CEN-REG-11 | Daniel A. Robles", type: "REGULAR", zone: "CENTRO", department: "HUÁNUCO", base: "Daniel A. Robles", lat: -9.19, lng: -75.95, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "56", label: "CQ-CEN-REG-12 | Yarinacocha", type: "REGULAR", zone: "CENTRO", department: "UCAYALI", base: "Yarinacocha", lat: -8.387968, lng: -74.566868, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "57", label: "CQ-CEN-REG-13 | San Francisco (RP Pucallpa)", type: "REGULAR", zone: "CENTRO", department: "UCAYALI", base: "San Francisco", lat: -8.38564, lng: -74.555998, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "58", label: "CQ-CEN-REG-14 | Neshuya", type: "REGULAR", zone: "CENTRO", department: "UCAYALI", base: "Neshuya", lat: -8.615389, lng: -74.965083, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "59", label: "CQ-CEN-REG-15 | Juanjuí", type: "REGULAR", zone: "CENTRO", department: "SAN MARTÍN", base: "Juanjuí", lat: -7.227406, lng: -76.774817, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "60", label: "CQ-CEN-REG-16 | Bellavista", type: "REGULAR", zone: "CENTRO", department: "SAN MARTÍN", base: "Bellavista", lat: -7.063556, lng: -76.585, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "61", label: "CQ-CEN-REG-17 | Iquitos (Loreto)", type: "REGULAR", zone: "CENTRO", department: "LORETO", base: "Iquitos", lat: -3.743528, lng: -73.246917, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "62", label: "CQ-CEN-REG-18 | Quistococha", type: "REGULAR", zone: "CENTRO", department: "LORETO", base: "Quistococha", lat: -3.828311, lng: -73.326079, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "63", label: "CQ-CEN-REG-19 | Carmen Alto (Mirador)", type: "REGULAR", zone: "CENTRO", department: "AYACUCHO", base: "Carmen Alto", lat: -13.17169, lng: -74.22294, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "64", label: "CQ-CEN-REG-20 | Tambo (Anco)", type: "REGULAR", zone: "CENTRO", department: "AYACUCHO", base: "Tambo (Anco)", lat: -12.858431, lng: -73.924128, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "65", label: "CQ-CEN-REG-21 | Huancavelica/Yauli", type: "REGULAR", zone: "CENTRO", department: "HUANCAVELICA", base: "Yauli/Huancavelica", lat: -12.72525, lng: -74.778917, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "66", label: "CQ-CEN-CHOQUE-01 | Huancayo Centro", type: "CHOQUE", zone: "CENTRO", department: "JUNÍN", base: "Huancayo Centro", lat: -12.068997, lng: -75.210564, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "67", label: "CQ-CEN-CHOQUE-02 | Ica Centro", type: "CHOQUE", zone: "CENTRO", department: "ICA", base: "Ica Centro", lat: -14.075452, lng: -75.739689, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "68", label: "CQ-SUR-REG-01 | Cayma/Av Ejército", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "Cayma", lat: -16.390997, lng: -71.546831, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "69", label: "CQ-SUR-REG-02 | Cerro Colorado", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "Cerro Colorado", lat: -16.37428, lng: -71.557531, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "70", label: "CQ-SUR-REG-03 | José L. Bustamante y Rivero", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "JLByR", lat: -16.410701, lng: -71.520075, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "71", label: "CQ-SUR-REG-04 | Miraflores (AQP)", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "Miraflores", lat: -16.389577, lng: -71.51989, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "72", label: "CQ-SUR-REG-05 | Chivay", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "Chivay", lat: -15.695194, lng: -71.613278, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "73", label: "CQ-SUR-REG-06 | Mollendo", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "Mollendo", lat: -17.017611, lng: -72.0225, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "74", label: "CQ-SUR-REG-07 | Matarani", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "Matarani", lat: -16.945389, lng: -72.085861, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "75", label: "CQ-SUR-REG-08 | Uchumayo", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "Uchumayo", lat: -16.46302, lng: -71.70978, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "76", label: "CQ-SUR-REG-09 | Atiquipa", type: "REGULAR", zone: "SUR", department: "AREQUIPA", base: "Atiquipa", lat: -15.811284, lng: -74.391969, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "77", label: "CQ-SUR-REG-10 | San Sebastián", type: "REGULAR", zone: "SUR", department: "CUSCO", base: "San Sebastián", lat: -13.528322, lng: -71.933828, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "78", label: "CQ-SUR-REG-11 | Huayllabamba", type: "REGULAR", zone: "SUR", department: "CUSCO", base: "Huayllabamba", lat: -13.337556, lng: -72.067444, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "79", label: "CQ-SUR-REG-12 | Machupicchu", type: "REGULAR", zone: "SUR", department: "CUSCO", base: "Machupicchu", lat: -13.15392, lng: -72.52711, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "80", label: "CQ-SUR-REG-13 | Paruro", type: "REGULAR", zone: "SUR", department: "CUSCO", base: "Paruro", lat: -13.790486, lng: -71.846212, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "81", label: "CQ-SUR-REG-14 | Chamaca", type: "REGULAR", zone: "SUR", department: "CUSCO", base: "Chamaca", lat: -14.468672, lng: -72.046435, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "82", label: "CQ-SUR-REG-15 | Quillabamba", type: "REGULAR", zone: "SUR", department: "CUSCO", base: "Quillabamba", lat: -12.864445, lng: -72.679056, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "83", label: "CQ-SUR-REG-16 | Kimbiri", type: "REGULAR", zone: "SUR", department: "CUSCO", base: "Kimbiri", lat: -12.620217, lng: -73.786484, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "84", label: "CQ-SUR-REG-17 | Puno Centro", type: "REGULAR", zone: "SUR", department: "PUNO", base: "Puno", lat: -15.844666, lng: -70.020276, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "85", label: "CQ-SUR-REG-18 | Juliaca Centro", type: "REGULAR", zone: "SUR", department: "PUNO", base: "Juliaca", lat: -15.501417, lng: -70.124859, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "86", label: "CQ-SUR-REG-19 | Putina", type: "REGULAR", zone: "SUR", department: "PUNO", base: "Putina", lat: -14.701508, lng: -69.750233, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "87", label: "CQ-SUR-REG-20 | Caminaca", type: "REGULAR", zone: "SUR", department: "PUNO", base: "Caminaca", lat: -15.293583, lng: -70.06272, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "88", label: "CQ-SUR-REG-21 | Torata (Lloquene)", type: "REGULAR", zone: "SUR", department: "MOQUEGUA", base: "Torata (Lloquene)", lat: -17.170011, lng: -70.725931, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "89", label: "CQ-SUR-REG-22 | Salviani", type: "REGULAR", zone: "SUR", department: "MOQUEGUA", base: "Salviani", lat: -17.13414, lng: -70.680817, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "90", label: "CQ-SUR-REG-23 | Puerto Maldonado", type: "REGULAR", zone: "SUR", department: "MADRE DE DIOS", base: "Puerto Maldonado", lat: -12.595922, lng: -69.188326, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "91", label: "CQ-SUR-CHOQUE-01 | Cayma/Av Ejército", type: "CHOQUE", zone: "SUR", department: "AREQUIPA", base: "Cayma", lat: -16.390997, lng: -71.546831, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "92", label: "CQ-SUR-CHOQUE-02 | Cerro Colorado", type: "CHOQUE", zone: "SUR", department: "AREQUIPA", base: "Cerro Colorado", lat: -16.37428, lng: -71.557531, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "93", label: "CQ-NOR-REG-01 | Trujillo Centro", type: "REGULAR", zone: "NORTE", department: "LA LIBERTAD", base: "Trujillo Centro", lat: -8.111806, lng: -79.027694, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "94", label: "CQ-NOR-REG-02 | Chao", type: "REGULAR", zone: "NORTE", department: "LA LIBERTAD", base: "Chao", lat: -8.538333, lng: -78.676722, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "95", label: "CQ-NOR-REG-03 | Virú", type: "REGULAR", zone: "NORTE", department: "LA LIBERTAD", base: "Virú", lat: -8.424581, lng: -78.778719, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "96", label: "CQ-NOR-REG-04 | Pacasmayo", type: "REGULAR", zone: "NORTE", department: "LA LIBERTAD", base: "Pacasmayo", lat: -7.40742, lng: -79.55894, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "97", label: "CQ-NOR-REG-05 | Chiclayo Centro", type: "REGULAR", zone: "NORTE", department: "LAMBAYEQUE", base: "Chiclayo Centro", lat: -6.779116, lng: -79.832372, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "98", label: "CQ-NOR-REG-06 | Pimentel", type: "REGULAR", zone: "NORTE", department: "LAMBAYEQUE", base: "Pimentel", lat: -6.766584, lng: -79.872806, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "99", label: "CQ-NOR-REG-07 | Lambayeque", type: "REGULAR", zone: "NORTE", department: "LAMBAYEQUE", base: "Lambayeque", lat: -6.69958, lng: -79.90186, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "100", label: "CQ-NOR-REG-08 | Castilla / Piura", type: "REGULAR", zone: "NORTE", department: "PIURA", base: "Castilla / Piura", lat: -5.182044, lng: -80.622078, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "101", label: "CQ-NOR-REG-09 | Paita", type: "REGULAR", zone: "NORTE", department: "PIURA", base: "Paita", lat: -5.087278, lng: -81.106417, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "102", label: "CQ-NOR-REG-10 | Las Lomas", type: "REGULAR", zone: "NORTE", department: "PIURA", base: "Las Lomas", lat: -4.701419, lng: -80.211918, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "103", label: "CQ-NOR-REG-11 | Cajamarca Centro", type: "REGULAR", zone: "NORTE", department: "CAJAMARCA", base: "Cajamarca Centro", lat: -7.152778, lng: -78.515028, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "104", label: "CQ-NOR-REG-12 | Atahualpa", type: "REGULAR", zone: "NORTE", department: "CAJAMARCA", base: "Atahualpa", lat: -7.167139, lng: -78.504083, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "105", label: "CQ-NOR-REG-13 | Namora", type: "REGULAR", zone: "NORTE", department: "CAJAMARCA", base: "Namora", lat: -7.212722, lng: -78.334083, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "106", label: "CQ-NOR-REG-14 | Jaén Norte", type: "REGULAR", zone: "NORTE", department: "CAJAMARCA", base: "Jaén Norte", lat: -5.6842, lng: -78.7848, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "107", label: "CQ-NOR-REG-15 | La Coipa (El Rejo)", type: "REGULAR", zone: "NORTE", department: "CAJAMARCA", base: "La Coipa (El Rejo)", lat: -5.43053, lng: -78.98911, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "108", label: "CQ-NOR-REG-16 | Huaraz", type: "REGULAR", zone: "NORTE", department: "ANCASH", base: "Huaraz", lat: -9.527496, lng: -77.528737, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "109", label: "CQ-NOR-REG-17 | Márkara", type: "REGULAR", zone: "NORTE", department: "ANCASH", base: "Márkara", lat: -9.33519, lng: -77.58594, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "110", label: "CQ-NOR-REG-18 | Nuevo Chimbote", type: "REGULAR", zone: "NORTE", department: "ANCASH", base: "Nuevo Chimbote", lat: -9.12283, lng: -78.52814, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "111", label: "CQ-NOR-REG-19 | Recuay", type: "REGULAR", zone: "NORTE", department: "ANCASH", base: "Recuay", lat: -9.745361, lng: -77.512861, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "112", label: "CQ-NOR-REG-20 | Jazán (Pedro Ruiz Gallo)", type: "REGULAR", zone: "NORTE", department: "AMAZONAS", base: "Jazán", lat: -5.94661, lng: -77.96722, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "113", label: "CQ-NOR-REG-21 | Trujillo Centro", type: "REGULAR", zone: "NORTE", department: "LA LIBERTAD", base: "Trujillo Centro", lat: -8.111806, lng: -79.027694, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Sistema eléctrico y tableros" },
  { id: "114", label: "CQ-NOR-REG-22 | Chao", type: "REGULAR", zone: "NORTE", department: "LA LIBERTAD", base: "Chao", lat: -8.538333, lng: -78.676722, skill1: "Diagnóstico TX/Backhaul", skill2: "Alineación de radioenlace", skill3: "Pruebas BER/Ethernet" },
  { id: "115", label: "CQ-NOR-REG-23 | Virú", type: "REGULAR", zone: "NORTE", department: "LA LIBERTAD", base: "Virú", lat: -8.424581, lng: -78.778719, skill1: "Empalme/OTDR de fibra (PEXT)", skill2: "Reparación de conectores y patch cords", skill3: "Medición de potencia óptica" },
  { id: "116", label: "CQ-NOR-REG-24 | Pacasmayo", type: "REGULAR", zone: "NORTE", department: "LA LIBERTAD", base: "Pacasmayo", lat: -7.40742, lng: -79.55894, skill1: "Verificación HSE", skill2: "Bloqueo/Etiquetado (LOTO)", skill3: "Trabajo en altura/arnés" },
  { id: "117", label: "CQ-NOR-REG-25 | Chiclayo Centro", type: "REGULAR", zone: "NORTE", department: "LAMBAYEQUE", base: "Chiclayo Centro", lat: -6.779116, lng: -79.832372, skill1: "Mantenimiento preventivo integral", skill2: "Puesta a tierra y limpieza", skill3: "Gestión de tickets y cierre" },
  { id: "118", label: "CQ-NOR-CHOQUE-01 | Trujillo Centro", type: "CHOQUE", zone: "NORTE", department: "LA LIBERTAD", base: "Trujillo Centro", lat: -8.111806, lng: -79.027694, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
  { id: "119", label: "CQ-NOR-CHOQUE-02 | Chiclayo Centro", type: "CHOQUE", zone: "NORTE", department: "LAMBAYEQUE", base: "Chiclayo Centro", lat: -6.779116, lng: -79.832372, skill1: "Revisión de corte de energía", skill2: "Conmutación a grupo electrógeno", skill3: "Respuesta rápida multi-tecnología" },
];

export function generateCrews(): CrewSeed[] {
  return CREW_DATA.map(crew => {
    const seed = seedNum(crew.id);
    const inv = pickMany(INVENTORY_CATALOG, 3 + (seed % 3), seed).map((it, j) => ({
      ...it, qty: ((seed + j) % 4) + 1
    }));

    const skills = [crew.skill1, crew.skill2];
    if (crew.skill3) {
      skills.push(crew.skill3);
    }

    return {
      id: crew.id,
      label: crew.label,
      type: crew.type,
      zone: crew.zone,
      department: crew.department,
      base: crew.base,
      lastLocation: {
        lat: crew.lat,
        lng: crew.lng,
        ts: new Date().toISOString()
      },
      skills,
      status: (seed % 10 < 7) ? "AVAILABLE" : ((seed % 10 < 9) ? "BUSY" : "OFF") as "AVAILABLE" | "BUSY" | "OFF",
      route: {
        etaMinBaseline: 15 + (seed % 40),
        distKmBaseline: 3 + ((seed % 200) / 10)
      },
      workload: { openAssignedTickets: seed % 4 },
      inventory: inv,
    };
  });
}
