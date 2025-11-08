/**
 * Utilidades para manejo de zona horaria de Perú (UTC-5)
 */

/**
 * Convierte una fecha a formato ISO local de Perú (UTC-5)
 * @param date - Fecha a convertir (por defecto: fecha actual)
 * @returns String en formato ISO sin 'Z' (ej: "2024-11-07T10:30:45")
 */
export function toPeruTime(date: Date = new Date()): string {
  return date.toLocaleString('sv-SE', { 
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(' ', 'T');
}

/**
 * Obtiene la fecha/hora actual de Perú en formato ISO
 * @returns String en formato ISO local de Perú
 */
export function getPeruNow(): string {
  return toPeruTime(new Date());
}

/**
 * Convierte timestamp de milisegundos a formato ISO local de Perú
 * @param timestamp - Timestamp en milisegundos
 * @returns String en formato ISO local de Perú
 */
export function timestampToPeruTime(timestamp: number): string {
  return toPeruTime(new Date(timestamp));
}
