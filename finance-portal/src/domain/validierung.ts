import { IBanfEntwurf, IKostenstelle, MWST_SAETZE } from './types';

export const MAX_POSITIONEN = 50;

/** Fehlermeldungen je Feld; Positionsfehler als "position.<index>". Leeres Objekt = gültig. */
export type ValidierungsFehler = Record<string, string>;

export function validiereEntwurf(
  entwurf: IBanfEntwurf,
  kostenstellen: IKostenstelle[],
  heute: string
): ValidierungsFehler {
  const fehler: ValidierungsFehler = {};

  if (!entwurf.titel.trim()) {
    fehler.titel = 'Bitte einen Titel angeben.';
  } else if (entwurf.titel.length > 255) {
    fehler.titel = 'Der Titel darf höchstens 255 Zeichen lang sein.';
  }

  const kostenstelle = kostenstellen.filter(k => k.id === entwurf.kostenstelleId)[0];
  if (!kostenstelle) {
    fehler.kostenstelle = 'Bitte eine Kostenstelle wählen.';
  } else if (!kostenstelle.aktiv) {
    fehler.kostenstelle = 'Die Kostenstelle ist nicht mehr aktiv.';
  }

  if (!entwurf.lieferant.trim()) {
    fehler.lieferant = 'Bitte einen Lieferanten angeben.';
  }

  if (!entwurf.begruendung.trim()) {
    fehler.begruendung = 'Bitte den Bedarf begründen.';
  }

  if (entwurf.wunschliefertermin && entwurf.wunschliefertermin < heute) {
    fehler.wunschliefertermin = 'Der Wunschliefertermin liegt in der Vergangenheit.';
  }

  if (entwurf.positionen.length === 0) {
    fehler.positionen = 'Bitte mindestens eine Position erfassen.';
  } else if (entwurf.positionen.length > MAX_POSITIONEN) {
    fehler.positionen = `Höchstens ${MAX_POSITIONEN} Positionen je BANF.`;
  }

  entwurf.positionen.forEach((position, index) => {
    const meldungen: string[] = [];
    if (!position.bezeichnung.trim()) {
      meldungen.push('Bezeichnung fehlt');
    }
    if (!(position.menge > 0) || !isFinite(position.menge)) {
      meldungen.push('Menge muss größer 0 sein');
    }
    if (!position.einheit.trim()) {
      meldungen.push('Einheit fehlt');
    }
    if (!(position.einzelpreisNettoCent >= 0) || !Number.isInteger(position.einzelpreisNettoCent)) {
      meldungen.push('Einzelpreis ungültig');
    }
    if (MWST_SAETZE.indexOf(position.mwstSatz) < 0) {
      meldungen.push('MwSt-Satz ungültig');
    }
    if (meldungen.length > 0) {
      fehler[`position.${index}`] = `Position ${index + 1}: ${meldungen.join(', ')}.`;
    }
  });

  return fehler;
}

export function istGueltig(fehler: ValidierungsFehler): boolean {
  return Object.keys(fehler).length === 0;
}
