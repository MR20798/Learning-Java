import { positionenAusJson, positionenZuJson } from '../positionenJson';
import { IBanfEntwurf, IKostenstelle } from '../types';
import { istGueltig, validiereEntwurf } from '../validierung';

const kostenstellen: IKostenstelle[] = [
  { id: 1, nummer: '4711', bezeichnung: 'Entwicklung', verantwortlicher: { email: 't@x', displayName: 'T' }, aktiv: true },
  { id: 2, nummer: '0815', bezeichnung: 'Alt', verantwortlicher: { email: 't@x', displayName: 'T' }, aktiv: false }
];

const gueltig: IBanfEntwurf = {
  titel: 'Oszilloskop',
  kostenstelleId: 1,
  lieferant: 'Messtechnik GmbH',
  begruendung: 'Zweites Messgerät für Prüfplatz 3',
  wunschliefertermin: '2026-11-01',
  positionen: [{ bezeichnung: 'Oszilloskop 4 Kanal', menge: 1, einheit: 'Stk', einzelpreisNettoCent: 450000, mwstSatz: 19 }]
};

describe('validiereEntwurf', () => {
  it('akzeptiert einen vollständigen Entwurf', () => {
    expect(istGueltig(validiereEntwurf(gueltig, kostenstellen, '2026-10-05'))).toBe(true);
  });

  it('meldet fehlende Pflichtfelder', () => {
    const fehler = validiereEntwurf(
      { ...gueltig, titel: ' ', kostenstelleId: undefined, lieferant: '', begruendung: '', positionen: [] },
      kostenstellen, '2026-10-05');
    expect(Object.keys(fehler).sort()).toEqual(['begruendung', 'kostenstelle', 'lieferant', 'positionen', 'titel']);
  });

  it('lehnt inaktive Kostenstellen und vergangene Liefertermine ab', () => {
    const fehler = validiereEntwurf({ ...gueltig, kostenstelleId: 2, wunschliefertermin: '2026-10-04' },
      kostenstellen, '2026-10-05');
    expect(fehler.kostenstelle).toBeDefined();
    expect(fehler.wunschliefertermin).toBeDefined();
  });

  it('prüft Positionen einzeln', () => {
    const fehler = validiereEntwurf({
      ...gueltig,
      positionen: [gueltig.positionen[0], { bezeichnung: '', menge: 0, einheit: '', einzelpreisNettoCent: -1, mwstSatz: 19 }]
    }, kostenstellen, '2026-10-05');
    expect(fehler['position.0']).toBeUndefined();
    expect(fehler['position.1']).toBe('Position 2: Bezeichnung fehlt, Menge muss größer 0 sein, Einheit fehlt, Einzelpreis ungültig.');
  });
});

describe('Positionen als JSON', () => {
  it('Hin- und Rückweg sind verlustfrei', () => {
    expect(positionenAusJson(positionenZuJson(gueltig.positionen))).toEqual(gueltig.positionen);
  });

  it('verwirft ungültige Einträge und kaputtes JSON', () => {
    expect(positionenAusJson('kein json')).toEqual([]);
    expect(positionenAusJson('{"a":1}')).toEqual([]);
    expect(positionenAusJson('[{"bezeichnung":"x","menge":1,"einzelpreisNettoCent":1,"mwstSatz":16}, null]')).toEqual([]);
  });
});
