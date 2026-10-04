import { BanfStatus } from '../../domain/types';
import { datumsfeldZuIso, euroFeldZuCent, verlaufAusJson, zuBanf, zuFreigabestufe, zuVertretung } from '../mapper';

describe('mapper', () => {
  it('rechnet SharePoint-Währung ohne Rundungsfehler in Cent um', () => {
    expect(euroFeldZuCent(0.1 + 0.2)).toBe(30);
    expect(euroFeldZuCent(1234.56)).toBe(123456);
    expect(euroFeldZuCent(undefined)).toBe(0);
  });

  it('liest "nur Datum"-Felder als lokales Kalenderdatum', () => {
    // Mittags UTC ist in jeder Zeitzone zwischen UTC-11 und UTC+11 derselbe Kalendertag.
    expect(datumsfeldZuIso('2026-11-01T12:00:00Z')).toBe('2026-11-01');
    expect(datumsfeldZuIso('')).toBe('');
    expect(datumsfeldZuIso('kaputt')).toBe('');
  });

  it('liest Mehrfach-Lookups in beiden REST-Formaten', () => {
    expect(zuFreigabestufe({ Id: 1, KostenstellenId: [3, 4], AbBetragNetto: 5000 }).kostenstellenIds).toEqual([3, 4]);
    expect(zuFreigabestufe({ Id: 1, KostenstellenId: { results: [5] } }).kostenstellenIds).toEqual([5]);
    expect(zuFreigabestufe({ Id: 1, KostenstellenId: null }).kostenstellenIds).toEqual([]);
  });

  it('Vertretung gilt für den Ersteller des Eintrags', () => {
    const v = zuVertretung({
      Author: { Title: 'Tom', EMail: 'tom@x' }, Vertreter: { Title: 'Vera', EMail: 'vera@x' },
      VertretungVon: '2026-10-01T12:00:00Z', VertretungBis: '2026-10-10T12:00:00Z'
    });
    expect(v).toEqual({
      freigeber: { email: 'tom@x', displayName: 'Tom' }, vertreter: { email: 'vera@x', displayName: 'Vera' },
      von: '2026-10-01', bis: '2026-10-10'
    });
    expect(zuVertretung({ Author: { Title: 'Tom', EMail: 'tom@x' } })).toBeUndefined();
  });

  it('liest den Verlauf und verwirft unbekannte Einträge', () => {
    const verlauf = verlaufAusJson(JSON.stringify([
      { stufe: 'Kostenstelle 4711', freigeberEmail: 'tom@x', freigeberName: 'Tom', entscheidung: 'Genehmigt', kommentar: 'ok', zeitpunkt: 'z' },
      { stufe: 'x', entscheidung: 'Vielleicht' }
    ]));
    expect(verlauf).toHaveLength(1);
    expect(verlauf[0].freigeber.displayName).toBe('Tom');
  });

  it('bildet eine BANF ab und fällt bei unbekanntem Status sicher zurück', () => {
    const banf = zuBanf({
      Id: 7, Title: 'Kabel', BanfNummer: 'BANF-2026-00007', Antragsteller: { Title: 'Anna', EMail: 'anna@x' },
      SummeNetto: 10.5, BanfStatus: 'Freigegeben', PositionenJson: '[]'
    });
    expect(banf.summeNettoCent).toBe(1050);
    expect(banf.status).toBe(BanfStatus.Freigegeben);
    expect(banf.aktuellerFreigeber).toBeUndefined();
    expect(zuBanf({ Id: 1, BanfStatus: 'Unsinn' }).status).toBe(BanfStatus.Eingereicht);
  });
});
