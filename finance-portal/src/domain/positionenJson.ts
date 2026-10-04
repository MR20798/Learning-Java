import { IBanfPosition, MWST_SAETZE, MwStSatz } from './types';

/**
 * Positionen werden in SharePoint als JSON im Feld "PositionenJson" gespeichert.
 * Das Schema ist bewusst flach, damit der Flow es mit "Parse JSON" lesen kann
 * (siehe docs/flow-banf-freigabe.md).
 */
interface IPositionDto {
  bezeichnung: string;
  menge: number;
  einheit: string;
  einzelpreisNettoCent: number;
  mwstSatz: number;
}

export function positionenZuJson(positionen: IBanfPosition[]): string {
  const dtos: IPositionDto[] = positionen.map(p => ({
    bezeichnung: p.bezeichnung.trim(),
    menge: p.menge,
    einheit: p.einheit.trim(),
    einzelpreisNettoCent: p.einzelpreisNettoCent,
    mwstSatz: p.mwstSatz
  }));
  return JSON.stringify(dtos);
}

/** Liest Positionen tolerant; unlesbare Einträge werden verworfen statt die Anzeige zu blockieren. */
export function positionenAusJson(json: string | undefined): IBanfPosition[] {
  if (!json) {
    return [];
  }
  let roh: unknown;
  try {
    roh = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(roh)) {
    return [];
  }
  const ergebnis: IBanfPosition[] = [];
  for (const eintrag of roh as Partial<IPositionDto>[]) {
    if (!eintrag || typeof eintrag !== 'object') {
      continue;
    }
    const satz = Number(eintrag.mwstSatz);
    if (typeof eintrag.bezeichnung !== 'string'
      || typeof eintrag.menge !== 'number'
      || typeof eintrag.einzelpreisNettoCent !== 'number'
      || MWST_SAETZE.indexOf(satz as MwStSatz) < 0) {
      continue;
    }
    ergebnis.push({
      bezeichnung: eintrag.bezeichnung,
      menge: eintrag.menge,
      einheit: typeof eintrag.einheit === 'string' ? eintrag.einheit : '',
      einzelpreisNettoCent: eintrag.einzelpreisNettoCent,
      mwstSatz: satz as MwStSatz
    });
  }
  return ergebnis;
}
