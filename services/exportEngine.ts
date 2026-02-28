import { RenderReadyResult } from '../types';
import { sanitizeForCSV } from '../utils/formatters';

/**
 * Génère un CSV strictement plat à partir des résultats du Kernel
 */
export const generateResultsCSV = (results: RenderReadyResult[], raceName: string) => {
  if (results.length === 0) return;

  const headers = [
    "Rang",
    "Dossard",
    "Nom",
    "Prénom",
    "Catégorie",
    "Place_Cat",
    "Sexe",
    "Club",
    "Dernier Point",
    "Temps",
    "Vitesse (km/h)",
    "Progression (%)"
  ];

  const rows = results.map(r => [
    r.rank,
    sanitizeForCSV(r.bib),
    sanitizeForCSV(r.lastName),
    sanitizeForCSV(r.firstName),
    sanitizeForCSV(r.category),
    r.rankCategory,
    sanitizeForCSV(r.gender),
    sanitizeForCSV(r.club),
    sanitizeForCSV(r.lastCheckpointName),
    r.displayTime,
    r.displaySpeed,
    `${r.progress}%`
  ]);

  const csvContent = [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');

  const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `Minguen_Resultats_${raceName.replace(/\s+/g, '_')}_${timestamp}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};