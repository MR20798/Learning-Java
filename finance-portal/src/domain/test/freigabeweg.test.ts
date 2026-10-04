import { ermittleFreigabeweg, IFreigabewegEingabe } from '../freigabeweg';
import { IFreigabestufe, IKostenstelle, IPerson, IVertretung } from '../types';

const person = (name: string): IPerson => ({ email: `${name.toLowerCase()}@vxi.example`, displayName: name });

const anna = person('Anna');       // Mitarbeiterin
const tom = person('Tom');         // Kostenstellenverantwortlicher 4711
const bea = person('Bea');         // Bereichsleitung
const gf = person('Gerd');         // Geschäftsführung
const cfo = person('Carla');       // Rückfall-Freigeberin
const vera = person('Vera');       // Vertreterin

const kst: IKostenstelle = { id: 1, nummer: '4711', bezeichnung: 'Entwicklung', verantwortlicher: tom, aktiv: true };

const stufe = (id: number, bezeichnung: string, reihenfolge: number, abEuro: number, freigeber: IPerson,
  kostenstellenIds: number[] = []): IFreigabestufe =>
  ({ id, bezeichnung, reihenfolge, abBetragNettoCent: abEuro * 100, freigeber, kostenstellenIds, aktiv: true });

const stufen: IFreigabestufe[] = [
  stufe(2, 'Geschäftsführung', 20, 25000, gf),
  stufe(1, 'Bereichsleitung', 10, 5000, bea)
];

function eingabe(teil: Partial<IFreigabewegEingabe>): IFreigabewegEingabe {
  return {
    antragsteller: anna, kostenstelle: kst, nettoCent: 100000, stufen, vertretungen: [],
    stichtag: '2026-10-05', rueckfallFreigeber: cfo, ...teil
  };
}

const offeneFreigeber = (e: IFreigabewegEingabe): string[] =>
  ermittleFreigabeweg(e).schritte.filter(s => s.status === 'offen').map(s => s.freigeber!.displayName);

describe('ermittleFreigabeweg', () => {
  it('kleiner Betrag: nur Kostenstellenverantwortlicher', () => {
    expect(offeneFreigeber(eingabe({ nettoCent: 499999 }))).toEqual(['Tom']);
  });

  it('Betragsgrenze ist inklusiv und Stufen werden nach Reihenfolge sortiert', () => {
    expect(offeneFreigeber(eingabe({ nettoCent: 500000 }))).toEqual(['Tom', 'Bea']);
    expect(offeneFreigeber(eingabe({ nettoCent: 2500000 }))).toEqual(['Tom', 'Bea', 'Gerd']);
  });

  it('kostenstellenspezifische Stufe gilt nur für ihre Kostenstellen', () => {
    const nurFuerAndere = [...stufen, stufe(3, 'Projektleitung', 5, 0, vera, [99])];
    expect(offeneFreigeber(eingabe({ nettoCent: 1000, stufen: nurFuerAndere }))).toEqual(['Tom']);
    const fuerDiese = [...stufen, stufe(3, 'Projektleitung', 5, 0, vera, [1])];
    expect(offeneFreigeber(eingabe({ nettoCent: 1000, stufen: fuerDiese }))).toEqual(['Tom', 'Vera']);
  });

  it('inaktive Stufen werden ignoriert', () => {
    const inaktiv = stufen.map(s => ({ ...s, aktiv: false }));
    expect(offeneFreigeber(eingabe({ nettoCent: 9999999, stufen: inaktiv }))).toEqual(['Tom']);
  });

  it('aktive Vertretung ersetzt den Freigeber (Zeitraum inklusiv)', () => {
    const vertretungen: IVertretung[] = [{ freigeber: tom, vertreter: vera, von: '2026-10-01', bis: '2026-10-05' }];
    const weg = ermittleFreigabeweg(eingabe({ vertretungen }));
    expect(weg.schritte[0].freigeber).toEqual(vera);
    expect(weg.schritte[0].vorgesehen).toEqual(tom);
    expect(offeneFreigeber(eingabe({ vertretungen, stichtag: '2026-10-06' }))).toEqual(['Tom']);
  });

  it('E-Mail-Vergleich ignoriert Groß-/Kleinschreibung', () => {
    const vertretungen: IVertretung[] = [{
      freigeber: { email: 'TOM@VXI.EXAMPLE', displayName: 'Tom' }, vertreter: vera, von: '2026-01-01', bis: '2026-12-31'
    }];
    expect(offeneFreigeber(eingabe({ vertretungen }))).toEqual(['Vera']);
  });

  describe('Vier-Augen-Prinzip', () => {
    it('Antragsteller ist Kostenstellenverantwortlicher: Vertreter genehmigt', () => {
      const vertretungen: IVertretung[] = [{ freigeber: tom, vertreter: vera, von: '2026-01-01', bis: '2026-12-31' }];
      expect(offeneFreigeber(eingabe({ antragsteller: tom, vertretungen }))).toEqual(['Vera']);
    });

    it('Antragsteller ist Kostenstellenverantwortlicher ohne Vertretung: nächste Stufe genehmigt', () => {
      const weg = ermittleFreigabeweg(eingabe({ antragsteller: tom, nettoCent: 600000 }));
      expect(weg.schritte.map(s => s.status)).toEqual(['übersprungen', 'offen']);
      expect(weg.schritte[1].freigeber).toEqual(bea);
    });

    it('Antragsteller wäre einziger Freigeber: Rückfall-Freigeberin genehmigt', () => {
      expect(offeneFreigeber(eingabe({ antragsteller: tom }))).toEqual(['Carla']);
    });

    it('Antragsteller ist höchste Stufe: Rückfall-Freigeberin kommt hinzu', () => {
      expect(offeneFreigeber(eingabe({ antragsteller: gf, nettoCent: 3000000 }))).toEqual(['Tom', 'Bea', 'Carla']);
    });

    it('Vertreter ist der Antragsteller: vorgesehener Freigeber bleibt zuständig', () => {
      const vertretungen: IVertretung[] = [{ freigeber: tom, vertreter: anna, von: '2026-01-01', bis: '2026-12-31' }];
      expect(offeneFreigeber(eingabe({ vertretungen }))).toEqual(['Tom']);
    });

    it('ohne Rückfall-Freigeber wird ein Fehler gemeldet', () => {
      const weg = ermittleFreigabeweg(eingabe({ antragsteller: tom, rueckfallFreigeber: undefined }));
      expect(weg.fehler).toBeDefined();
    });

    it('Rückfall-Freigeber darf nicht der Antragsteller sein', () => {
      const weg = ermittleFreigabeweg(eingabe({ antragsteller: cfo, kostenstelle: { ...kst, verantwortlicher: cfo } }));
      expect(weg.fehler).toBeDefined();
    });
  });

  it('dieselbe Person genehmigt nur einmal', () => {
    const kstMitBea: IKostenstelle = { ...kst, verantwortlicher: bea };
    const weg = ermittleFreigabeweg(eingabe({ kostenstelle: kstMitBea, nettoCent: 600000 }));
    expect(weg.schritte.map(s => s.status)).toEqual(['offen', 'übersprungen']);
  });

  it('inaktive Kostenstelle liefert einen Fehler', () => {
    expect(ermittleFreigabeweg(eingabe({ kostenstelle: { ...kst, aktiv: false } })).fehler).toBeDefined();
  });
});
