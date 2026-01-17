/**
 * Formate un temps en millisecondes en HH:mm:ss.SS
 */
export const formatMsToDisplay = (ms: number): string => {
  if (ms <= 0 || isNaN(ms)) return "00:00:00.00";
  
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const ss = Math.floor((ms % 1000) / 10);

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ss.toString().padStart(2, '0')}`;
};

/**
 * Calcule la vitesse en km/h
 */
export const calculateSpeed = (distanceKm: number, timeMs: number): string => {
  if (timeMs <= 0 || distanceKm <= 0) return "0.00";
  const hours = timeMs / 3600000;
  return (distanceKm / hours).toFixed(2);
};

/**
 * Nettoie une chaîne pour l'export CSV
 */
export const sanitizeForCSV = (val: string | number | undefined): string => {
  if (val === undefined || val === null) return "";
  const str = String(val);
  // Supprime les injections potentielles et les délimiteurs
  return str.replace(/[;"]/g, ' ').trim();
};