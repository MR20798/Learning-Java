import { centZuEuroText, positionNettoCent } from './betraege';
import { IBanf } from './types';

/**
 * CSV-Export freigegebener BANF für die Buchhaltung.
 *
 * Format für deutsches Excel: Semikolon als Trenner, Dezimalkomma,
 * UTF-8 mit BOM, CRLF als Zeilenende. Eine Zeile je Position.
 */

export const CSV_SPALTEN: string[] = [
  'BANF-Nr.',
  'Titel',
  'Antragsteller',
  'Kostenstelle',
  'Lieferant',
  'Eingereicht am',
  'Freigegeben am',
  'Pos.',
  'Bezeichnung',
  'Menge',
  'Einheit',
  'Einzelpreis netto',
  'Positionswert netto',
  'MwSt-Satz',
  'BANF Summe netto',
  'BANF Summe brutto'
];

/**
 * Maskiert einen Feldwert. Werte, die Excel als Formel interpretieren würde
 * (beginnend mit =, +, -, @, Tab oder CR), werden mit einem Apostroph
 * entschärft (Schutz vor CSV-Injection).
 */
export function csvFeld(wert: string): string {
  let text = wert;
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  if (/[";\r\n]/.test(text) || text !== text.trim()) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function menge(wert: number): string {
  return wert.toString().replace('.', ',');
}

/** ISO-Zeitstempel oder -Datum -> dd.mm.yyyy (leer bleibt leer). */
export function datumDe(iso: string): string {
  const treffer = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return treffer ? `${treffer[3]}.${treffer[2]}.${treffer[1]}` : '';
}

export function erzeugeCsv(banfs: IBanf[]): string {
  const zeilen: string[] = [CSV_SPALTEN.map(csvFeld).join(';')];

  for (const banf of banfs) {
    banf.positionen.forEach((position, index) => {
      zeilen.push([
        banf.nummer,
        banf.titel,
        banf.antragsteller.displayName,
        banf.kostenstelle,
        banf.lieferant,
        datumDe(banf.eingereichtAm),
        datumDe(banf.freigegebenAm),
        String(index + 1),
        position.bezeichnung,
        menge(position.menge),
        position.einheit,
        centZuEuroText(position.einzelpreisNettoCent),
        centZuEuroText(positionNettoCent(position)),
        `${position.mwstSatz} %`,
        centZuEuroText(banf.summeNettoCent),
        centZuEuroText(banf.summeBruttoCent)
      ].map(csvFeld).join(';'));
    });
  }

  return '﻿' + zeilen.join('\r\n') + '\r\n';
}
