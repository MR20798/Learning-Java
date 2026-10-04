import { berechneSummen, centZuEuroText, euroZuCent, positionNettoCent } from '../betraege';
import { IBanfPosition } from '../types';

const pos = (menge: number, einzelpreisNettoCent: number, mwstSatz: 0 | 7 | 19 = 19): IBanfPosition =>
  ({ bezeichnung: 'Artikel', menge, einheit: 'Stk', einzelpreisNettoCent, mwstSatz });

describe('Beträge', () => {
  it('rechnet Positionswerte mit gebrochenen Mengen und rundet kaufmännisch', () => {
    expect(positionNettoCent(pos(3, 1999))).toBe(5997);
    expect(positionNettoCent(pos(2.5, 333))).toBe(833); // 832,5 -> 833
  });

  it('berechnet Steuer je Satz auf die Netto-Summe', () => {
    // 3 x 0,33 € zu 19 %: Steuer auf 0,99 € = 0,1881 -> 0,19 € (nicht 3 x 0,06 = 0,18 €)
    const summen = berechneSummen([pos(1, 33), pos(1, 33), pos(1, 33), pos(1, 1000, 7)]);
    expect(summen.nettoCent).toBe(1099);
    expect(summen.steuerJeSatz).toEqual([
      { satz: 19, nettoCent: 99, steuerCent: 19 },
      { satz: 7, nettoCent: 1000, steuerCent: 70 }
    ]);
    expect(summen.steuerCent).toBe(89);
    expect(summen.bruttoCent).toBe(1188);
  });

  it('leere Positionen ergeben Null', () => {
    expect(berechneSummen([])).toEqual({ nettoCent: 0, steuerCent: 0, bruttoCent: 0, steuerJeSatz: [] });
  });

  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['12,5', 1250],
    ['99', 9900],
    [' 0,01 € ', 1],
    ['1.000.000', 100000000]
  ])('euroZuCent(%p) = %p', (eingabe, erwartet) => {
    expect(euroZuCent(eingabe)).toBe(erwartet);
  });

  it.each(['', 'abc', '-5', '1,234', '12.34', '1.23,00', '1,2,3'])('euroZuCent(%p) ist ungültig', eingabe => {
    expect(euroZuCent(eingabe)).toBeUndefined();
  });

  it('formatiert Cent deutsch', () => {
    expect(centZuEuroText(123456789)).toBe('1.234.567,89');
    expect(centZuEuroText(5)).toBe('0,05');
    expect(centZuEuroText(-1050)).toBe('-10,50');
  });
});
