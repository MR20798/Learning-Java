import { csvFeld, datumDe, erzeugeCsv } from '../csvExport';
import { BanfStatus, IBanf } from '../types';

const banf: IBanf = {
  id: 7,
  nummer: 'BANF-2026-00007',
  titel: 'Messkabel; Ersatz',
  antragsteller: { email: 'anna@vxi.example', displayName: 'Anna' },
  kostenstelle: '4711',
  lieferant: '=HYPERLINK("http://evil")',
  begruendung: 'Defekt',
  wunschliefertermin: '',
  positionen: [
    { bezeichnung: 'Kabel "BNC"', menge: 2.5, einheit: 'm', einzelpreisNettoCent: 1000, mwstSatz: 19 },
    { bezeichnung: 'Adapter', menge: 1, einheit: 'Stk', einzelpreisNettoCent: 123456, mwstSatz: 7 }
  ],
  summeNettoCent: 125956,
  summeBruttoCent: 0,
  status: BanfStatus.Freigegeben,
  aktuelleStufe: '',
  aktuellerFreigeber: undefined,
  eingereichtAm: '2026-10-01T08:15:00Z',
  freigegebenAm: '2026-10-02T09:00:00Z'
};

describe('CSV-Export', () => {
  it('maskiert Trennzeichen, Anführungszeichen und Formeln', () => {
    expect(csvFeld('einfach')).toBe('einfach');
    expect(csvFeld('a;b')).toBe('"a;b"');
    expect(csvFeld('Kabel "BNC"')).toBe('"Kabel ""BNC"""');
    expect(csvFeld('=1+1')).toBe("'=1+1");
    expect(csvFeld('-5')).toBe("'-5");
    expect(csvFeld('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvFeld('=A1;B1')).toBe('"\'=A1;B1"');
  });

  it('erzeugt eine Zeile je Position mit BOM und CRLF', () => {
    const csv = erzeugeCsv([banf]);
    expect(csv.charAt(0)).toBe('\uFEFF');
    const zeilen = csv.substring(1).split('\r\n');
    expect(zeilen).toHaveLength(4); // Kopf, 2 Positionen, abschließende Leerzeile
    expect(zeilen[3]).toBe('');
    expect(zeilen[1]).toBe([
      'BANF-2026-00007', '"Messkabel; Ersatz"', 'Anna', '4711', '"\'=HYPERLINK(""http://evil"")"',
      '01.10.2026', '02.10.2026', '1', '"Kabel ""BNC"""', '2,5', 'm', '10,00', '25,00', '19 %', '1.259,56', '0,00'
    ].join(';'));
    expect(zeilen[2]).toContain(';2;Adapter;1;Stk;1.234,56;1.234,56;7 %;');
  });

  it('formatiert Datumswerte', () => {
    expect(datumDe('2026-12-31')).toBe('31.12.2026');
    expect(datumDe('')).toBe('');
  });
});
