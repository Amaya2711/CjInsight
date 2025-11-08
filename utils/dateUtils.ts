/**
 * Convierte una fecha a la zona horaria de Perú (America/Lima, UTC-5)
 */
export function toPeruTime(date: Date = new Date()): Date {
  const peruOffset = -5 * 60;
  const localOffset = date.getTimezoneOffset();
  const diff = localOffset - peruOffset;
  return new Date(date.getTime() - diff * 60 * 1000);
}

/**
 * Devuelve un timestamp ISO en zona horaria de Perú con formato de fecha y hora separados
 */
export function getPeruTimestamp(): { fecha: string; hora: string; timestamp: string } {
  const peruDate = toPeruTime();
  const year = peruDate.getFullYear();
  const month = String(peruDate.getMonth() + 1).padStart(2, '0');
  const day = String(peruDate.getDate()).padStart(2, '0');
  const hours = String(peruDate.getHours()).padStart(2, '0');
  const minutes = String(peruDate.getMinutes()).padStart(2, '0');
  const seconds = String(peruDate.getSeconds()).padStart(2, '0');
  const ms = String(peruDate.getMilliseconds()).padStart(3, '0');

  const fecha = `${year}-${month}-${day}`;
  const hora = `${hours}:${minutes}:${seconds}.${ms}`;
  const timestamp = `${fecha}T${hora}-05:00`;

  return { fecha, hora, timestamp };
}
