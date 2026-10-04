import { IBanfPosition, MwStSatz } from './types';

export interface ISteuerZeile {
  satz: MwStSatz;
  nettoCent: number;
  steuerCent: number;
}

export interface ISummen {
  nettoCent: number;
  steuerCent: number;
  bruttoCent: number;
  /** Steuer je Satz, absteigend nach Satz sortiert; Sätze ohne Positionen fehlen. */
  steuerJeSatz: ISteuerZeile[];
}

/** Netto-Betrag einer Position in Cent (Menge darf Nachkommastellen haben, z. B. Stunden). */
export function positionNettoCent(position: IBanfPosition): number {
  return Math.round(position.menge * position.einzelpreisNettoCent);
}

/**
 * Summen einer BANF. Die Umsatzsteuer wird – wie auf einer Rechnung – je
 * Steuersatz auf die Netto-Summe berechnet und erst dann gerundet.
 */
export function berechneSummen(positionen: IBanfPosition[]): ISummen {
  const nettoJeSatz = new Map<MwStSatz, number>();
  for (const position of positionen) {
    const bisher = nettoJeSatz.get(position.mwstSatz) || 0;
    nettoJeSatz.set(position.mwstSatz, bisher + positionNettoCent(position));
  }

  const steuerJeSatz: ISteuerZeile[] = Array.from(nettoJeSatz.entries())
    .map(([satz, nettoCent]) => ({ satz, nettoCent, steuerCent: Math.round((nettoCent * satz) / 100) }))
    .sort((a, b) => b.satz - a.satz);

  const nettoCent = steuerJeSatz.reduce((summe, zeile) => summe + zeile.nettoCent, 0);
  const steuerCent = steuerJeSatz.reduce((summe, zeile) => summe + zeile.steuerCent, 0);
  return { nettoCent, steuerCent, bruttoCent: nettoCent + steuerCent, steuerJeSatz };
}

/**
 * Wandelt eine Euro-Eingabe in deutscher Schreibweise ("1.234,56", "12,5", "99")
 * in Cent um. Liefert undefined bei ungültiger oder negativer Eingabe.
 */
export function euroZuCent(eingabe: string): number | undefined {
  const bereinigt = eingabe.trim().replace(/\s|€/g, '');
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(bereinigt)) {
    return undefined;
  }
  const [euro, cent = ''] = bereinigt.replace(/\./g, '').split(',');
  return parseInt(euro, 10) * 100 + parseInt((cent + '00').substring(0, 2), 10);
}

/** Formatiert Cent als deutschen Betrag ohne Währungszeichen, z. B. 123456 -> "1.234,56". */
export function centZuEuroText(cent: number): string {
  const vorzeichen = cent < 0 ? '-' : '';
  const absolut = Math.abs(Math.round(cent));
  const euro = Math.floor(absolut / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const rest = ('0' + (absolut % 100)).slice(-2);
  return `${vorzeichen}${euro},${rest}`;
}

export function formatEuro(cent: number): string {
  return `${centZuEuroText(cent)} €`;
}
