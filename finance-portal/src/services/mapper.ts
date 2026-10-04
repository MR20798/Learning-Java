import { positionenAusJson } from '../domain/positionenJson';
import {
  BanfStatus, FreigabeEntscheidung, IBanf, IFreigabestufe, IKostenstelle, IPerson, IVerlaufEintrag, IVertretung
} from '../domain/types';

/**
 * Wandelt SharePoint-REST-Antworten in Fachobjekte um. Bewusst ohne PnPjs-
 * Abhängigkeit, damit die Abbildung ohne SharePoint testbar ist.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpItem = Record<string, any>;

export function person(wert: SpItem | undefined): IPerson | undefined {
  if (!wert || !wert.EMail) {
    return undefined;
  }
  return { email: String(wert.EMail), displayName: String(wert.Title || wert.EMail) };
}

const OHNE_PERSON: IPerson = { email: '', displayName: '(unbekannt)' };

/** SharePoint-Währung (Euro als Gleitkommazahl) -> Cent. */
export function euroFeldZuCent(wert: unknown): number {
  const zahl = Number(wert);
  return isFinite(zahl) ? Math.round(zahl * 100) : 0;
}

function zweistellig(zahl: number): string {
  return ('0' + zahl).slice(-2);
}

/**
 * Reines Datumsfeld -> yyyy-mm-dd im lokalen Kalenderdatum.
 *
 * SharePoint speichert "nur Datum" als Mitternacht in der Zeitzone der Website,
 * umgerechnet nach UTC (z. B. 2026-10-04T22:00:00Z für den 05.10. in Berlin).
 * Die Umrechnung in die lokale Zeit des Browsers ergibt wieder den 05.10.,
 * solange Website und Nutzer in derselben Zeitzone liegen.
 */
export function datumsfeldZuIso(wert: string | undefined): string {
  if (!wert) {
    return '';
  }
  const datum = new Date(wert);
  if (isNaN(datum.getTime())) {
    return '';
  }
  return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
}

export function heuteIso(jetzt: Date = new Date()): string {
  return `${jetzt.getFullYear()}-${zweistellig(jetzt.getMonth() + 1)}-${zweistellig(jetzt.getDate())}`;
}

export function zuKostenstelle(item: SpItem): IKostenstelle {
  return {
    id: item.Id,
    nummer: item.Title || '',
    bezeichnung: item.Bezeichnung || '',
    verantwortlicher: person(item.Verantwortlicher) || OHNE_PERSON,
    aktiv: item.Aktiv === true
  };
}

export function zuFreigabestufe(item: SpItem): IFreigabestufe {
  const ids = item.KostenstellenId;
  return {
    id: item.Id,
    bezeichnung: item.Title || '',
    reihenfolge: Number(item.Reihenfolge) || 0,
    abBetragNettoCent: euroFeldZuCent(item.AbBetragNetto),
    freigeber: person(item.Freigeber) || OHNE_PERSON,
    kostenstellenIds: Array.isArray(ids) ? ids : (ids && Array.isArray(ids.results) ? ids.results : []),
    aktiv: item.Aktiv === true
  };
}

export function zuVertretung(item: SpItem): IVertretung | undefined {
  const freigeber = person(item.Author);
  const vertreter = person(item.Vertreter);
  const von = datumsfeldZuIso(item.VertretungVon);
  const bis = datumsfeldZuIso(item.VertretungBis);
  if (!freigeber || !vertreter || !von || !bis) {
    return undefined;
  }
  return { freigeber, vertreter, von, bis };
}

const ENTSCHEIDUNGEN: FreigabeEntscheidung[] = ['Eingereicht', 'Genehmigt', 'Abgelehnt', 'Übersprungen', 'Fehler'];

/**
 * Verlauf aus dem Feld VerlaufJson. Der Flow schreibt flache Objekte:
 * { stufe, freigeberEmail, freigeberName, entscheidung, kommentar, zeitpunkt }
 */
export function verlaufAusJson(json: string | undefined): IVerlaufEintrag[] {
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
  return (roh as SpItem[])
    .filter(e => e && typeof e === 'object' && ENTSCHEIDUNGEN.indexOf(e.entscheidung) >= 0)
    .map(e => ({
      stufe: String(e.stufe || ''),
      freigeber: { email: String(e.freigeberEmail || ''), displayName: String(e.freigeberName || e.freigeberEmail || '') },
      entscheidung: e.entscheidung as FreigabeEntscheidung,
      kommentar: String(e.kommentar || ''),
      zeitpunkt: String(e.zeitpunkt || '')
    }));
}

function zuStatus(wert: unknown): BanfStatus {
  const alle = Object.keys(BanfStatus).map(k => (BanfStatus as Record<string, string>)[k]);
  return alle.indexOf(String(wert)) >= 0 ? (wert as BanfStatus) : BanfStatus.Eingereicht;
}

export function zuBanf(item: SpItem): IBanf {
  return {
    id: item.Id,
    nummer: item.BanfNummer || '',
    titel: item.Title || '',
    antragsteller: person(item.Antragsteller) || OHNE_PERSON,
    kostenstelle: item.KostenstelleNummer || '',
    lieferant: item.Lieferant || '',
    begruendung: item.Begruendung || '',
    wunschliefertermin: datumsfeldZuIso(item.Wunschliefertermin),
    positionen: positionenAusJson(item.PositionenJson),
    summeNettoCent: euroFeldZuCent(item.SummeNetto),
    summeBruttoCent: euroFeldZuCent(item.SummeBrutto),
    status: zuStatus(item.BanfStatus),
    aktuelleStufe: item.AktuelleStufe || '',
    aktuellerFreigeber: person(item.AktuellerFreigeber),
    eingereichtAm: item.EingereichtAm || '',
    freigegebenAm: item.FreigegebenAm || '',
    verlauf: verlaufAusJson(item.VerlaufJson)
  };
}
