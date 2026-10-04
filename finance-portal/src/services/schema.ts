/**
 * Listen- und Feldnamen (interne Namen) der BANF-Lösung.
 *
 * Muss mit provisioning/Deploy-BanfListen.ps1 und dem Flow übereinstimmen.
 */
export const LISTEN = {
  kostenstellen: 'BanfKostenstellen',
  freigabestufen: 'BanfFreigabestufen',
  vertretungen: 'BanfVertretungen',
  konfiguration: 'BanfKonfiguration',
  eingang: 'BanfEingang',
  bestellanforderungen: 'Bestellanforderungen',
  exportprotokoll: 'BanfExportprotokoll'
};

/** SharePoint-Gruppe der Buchhaltung; Mitglieder sehen den Export-Reiter. */
export const GRUPPE_BUCHHALTUNG = 'BANF Buchhaltung';

/** Schlüssel in der Liste BanfKonfiguration (Feld Title). */
export const KONFIG_RUECKFALL_FREIGEBER = 'RueckfallFreigeber';

export const FELDER = {
  kostenstelle: {
    nummer: 'Title',
    bezeichnung: 'Bezeichnung',
    verantwortlicher: 'Verantwortlicher',
    aktiv: 'Aktiv'
  },
  freigabestufe: {
    bezeichnung: 'Title',
    reihenfolge: 'Reihenfolge',
    abBetragNetto: 'AbBetragNetto',
    freigeber: 'Freigeber',
    kostenstellen: 'Kostenstellen',
    aktiv: 'Aktiv'
  },
  vertretung: {
    vertreter: 'Vertreter',
    von: 'VertretungVon',
    bis: 'VertretungBis'
  },
  konfiguration: {
    schluessel: 'Title',
    person: 'KonfigPerson'
  },
  /** Gemeinsame Felder von BanfEingang und Bestellanforderungen. */
  antrag: {
    titel: 'Title',
    kostenstelle: 'Kostenstelle',
    lieferant: 'Lieferant',
    begruendung: 'Begruendung',
    wunschliefertermin: 'Wunschliefertermin',
    positionenJson: 'PositionenJson'
  },
  eingang: {
    /** Wird erst gesetzt, wenn alle Anhänge hochgeladen sind; der Flow startet nur bei Bereit = Ja. */
    bereit: 'Bereit'
  },
  banf: {
    nummer: 'BanfNummer',
    antragsteller: 'Antragsteller',
    kostenstelleNummer: 'KostenstelleNummer',
    summeNetto: 'SummeNetto',
    summeBrutto: 'SummeBrutto',
    status: 'BanfStatus',
    aktuelleStufe: 'AktuelleStufe',
    aktuellerFreigeber: 'AktuellerFreigeber',
    eingereichtAm: 'EingereichtAm',
    freigegebenAm: 'FreigegebenAm',
    verlaufJson: 'VerlaufJson',
    eingangId: 'EingangId'
  },
  exportprotokoll: {
    zeitraumVon: 'ZeitraumVon',
    zeitraumBis: 'ZeitraumBis',
    anzahl: 'AnzahlBanf',
    banfNummern: 'BanfNummern'
  }
};
