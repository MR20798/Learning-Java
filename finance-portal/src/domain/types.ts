/**
 * Fachliche Typen des BANF-Prozesses.
 *
 * Geldbeträge werden durchgängig als ganze Cent-Beträge geführt, damit
 * Summen und Steuerberechnung frei von Gleitkomma-Rundungsfehlern bleiben.
 */

/** Ein Benutzer, eindeutig identifiziert über seinen UPN bzw. seine E-Mail-Adresse. */
export interface IPerson {
  email: string;
  displayName: string;
}

export type MwStSatz = 0 | 7 | 19;

export const MWST_SAETZE: MwStSatz[] = [19, 7, 0];

export interface IBanfPosition {
  bezeichnung: string;
  menge: number;
  einheit: string;
  /** Einzelpreis netto in Cent. */
  einzelpreisNettoCent: number;
  mwstSatz: MwStSatz;
}

export interface IKostenstelle {
  id: number;
  nummer: string;
  bezeichnung: string;
  verantwortlicher: IPerson;
  aktiv: boolean;
}

/**
 * Zusätzliche Freigabestufe, die ab einem Netto-Betrag greift
 * (z. B. Bereichsleitung ab 5.000 €, Geschäftsführung ab 25.000 €).
 */
export interface IFreigabestufe {
  id: number;
  bezeichnung: string;
  reihenfolge: number;
  /** Stufe greift, wenn der Netto-Gesamtbetrag >= diesem Wert ist (Cent). */
  abBetragNettoCent: number;
  freigeber: IPerson;
  /** Leere Liste = gilt für alle Kostenstellen. Sonst nur für die genannten Kostenstellen-IDs. */
  kostenstellenIds: number[];
  aktiv: boolean;
}

export interface IVertretung {
  freigeber: IPerson;
  vertreter: IPerson;
  /** Inklusive, ISO-Datum (yyyy-mm-dd). */
  von: string;
  /** Inklusive, ISO-Datum (yyyy-mm-dd). */
  bis: string;
}

export interface IBanfEntwurf {
  titel: string;
  kostenstelleId: number | undefined;
  lieferant: string;
  begruendung: string;
  /** ISO-Datum (yyyy-mm-dd) oder leer. */
  wunschliefertermin: string;
  positionen: IBanfPosition[];
}

export enum BanfStatus {
  Eingereicht = 'Eingereicht',
  InFreigabe = 'In Freigabe',
  Freigegeben = 'Freigegeben',
  Abgelehnt = 'Abgelehnt',
  Fehler = 'Fehler'
}

export interface IBanf {
  id: number;
  nummer: string;
  titel: string;
  antragsteller: IPerson;
  kostenstelle: string;
  lieferant: string;
  begruendung: string;
  wunschliefertermin: string;
  positionen: IBanfPosition[];
  summeNettoCent: number;
  summeBruttoCent: number;
  status: BanfStatus;
  aktuelleStufe: string;
  aktuellerFreigeber: IPerson | undefined;
  eingereichtAm: string;
  freigegebenAm: string;
}

export type FreigabeEntscheidung = 'Genehmigt' | 'Abgelehnt' | 'Übersprungen';

export interface IFreigabeProtokollEintrag {
  banfId: number;
  stufe: string;
  freigeber: IPerson;
  entscheidung: FreigabeEntscheidung;
  kommentar: string;
  zeitpunkt: string;
}
