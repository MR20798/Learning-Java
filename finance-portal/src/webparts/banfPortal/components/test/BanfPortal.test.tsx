// Jeder Test hängt das Portal ein; afterEach hängt es wieder aus.
/* eslint-disable @rushstack/pair-react-dom-render-unmount */
import * as React from 'react';
import * as ReactDom from 'react-dom';
import { act } from 'react-dom/test-utils';

import { BanfStatus, IBanf, IBanfEntwurf } from '../../../../domain/types';
import { BanfService, IAktuellerBenutzer, IStammdaten } from '../../../../services/BanfService';
import BanfPortal from '../BanfPortal';

const tom = { email: 'tom@vxi.example', displayName: 'Tom' };
const anna = { email: 'anna@vxi.example', displayName: 'Anna' };

const stammdaten: IStammdaten = {
  kostenstellen: [{ id: 1, nummer: '4711', bezeichnung: 'Entwicklung', verantwortlicher: tom, aktiv: true }],
  stufen: [],
  vertretungen: [],
  rueckfallFreigeber: undefined
};

const banf: IBanf = {
  id: 1, nummer: 'BANF-2026-00001', titel: 'Kabel', antragsteller: anna, kostenstelle: '4711', lieferant: 'L',
  begruendung: 'B', wunschliefertermin: '', positionen: [], summeNettoCent: 1000, summeBruttoCent: 1190,
  status: BanfStatus.InFreigabe, aktuelleStufe: 'Kostenstelle 4711', aktuellerFreigeber: tom,
  eingereichtAm: '2026-10-01T08:00:00Z', freigegebenAm: '', verlauf: []
};

function fakeService(eingereicht: IBanfEntwurf[], buchhaltung: boolean): BanfService {
  const benutzer: IAktuellerBenutzer = { id: 5, person: anna, istBuchhaltung: buchhaltung };
  return {
    ladeBenutzer: async () => benutzer,
    ladeStammdaten: async () => stammdaten,
    ladeMeineBanfs: async () => [banf],
    ladeBeiMirZurFreigabe: async () => [],
    ladeOffeneEingaenge: async () => [],
    ladeFreigegebene: async () => [],
    protokolliereExport: async () => undefined,
    reicheEin: async (entwurf: IBanfEntwurf) => { eingereicht.push(entwurf); return 1; }
  } as unknown as BanfService;
}

async function warten(): Promise<void> {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
}

function eingeben(feld: HTMLInputElement | HTMLTextAreaElement, wert: string): void {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(feld), 'value')!.set!;
  act(() => {
    setter.call(feld, wert);
    feld.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function knopf(container: HTMLElement, text: string): HTMLButtonElement {
  const treffer = Array.from(container.querySelectorAll('button')).filter(b => (b.textContent || '').indexOf(text) >= 0)[0];
  if (!treffer) {
    throw new Error(`Knopf "${text}" nicht gefunden`);
  }
  return treffer;
}

describe('BanfPortal', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDom.unmountComponentAtNode(container);
    container.remove();
  });

  it('zeigt den Export-Reiter nur für die Buchhaltung', async () => {
    act(() => { ReactDom.render(<BanfPortal service={fakeService([], false)} />, container); });
    await warten();
    expect(container.textContent).toContain('Neue BANF');
    expect(container.textContent).not.toContain('Export Buchhaltung');

    ReactDom.unmountComponentAtNode(container);
    act(() => { ReactDom.render(<BanfPortal service={fakeService([], true)} />, container); });
    await warten();
    expect(container.textContent).toContain('Export Buchhaltung');
  });

  it('validiert und reicht eine BANF ein', async () => {
    const eingereicht: IBanfEntwurf[] = [];
    act(() => { ReactDom.render(<BanfPortal service={fakeService(eingereicht, false)} />, container); });
    await warten();

    act(() => { knopf(container, 'Zur Freigabe einreichen').click(); });
    await warten();
    expect(container.textContent).toContain('Bitte einen Titel angeben.');
    expect(eingereicht).toHaveLength(0);

    const textfelder = Array.from(container.querySelectorAll('input[type="text"], textarea')) as HTMLInputElement[];
    const nachLabel = (label: string): HTMLInputElement => {
      const l = Array.from(container.querySelectorAll('label')).filter(x => (x.textContent || '').indexOf(label) === 0)[0];
      return document.getElementById(l.htmlFor) as HTMLInputElement;
    };
    eingeben(nachLabel('Titel'), 'Messkabel');
    eingeben(nachLabel('Lieferant'), 'Kabel GmbH');
    eingeben(nachLabel('Begründung'), 'Ersatz für defekte Kabel');
    eingeben(container.querySelector('input[aria-label="Bezeichnung"]') as HTMLInputElement, 'BNC-Kabel 1 m');
    eingeben(container.querySelector('input[aria-label="Menge"]') as HTMLInputElement, '2,5');
    eingeben(container.querySelector('input[aria-label="Einzelpreis netto in Euro"]') as HTMLInputElement, '12,40');
    expect(textfelder.length).toBeGreaterThan(0);

    // Kostenstelle über das Fluent-Dropdown wählen
    act(() => { (container.querySelector('[role="combobox"]') as HTMLElement).click(); });
    const option = Array.from(document.querySelectorAll('[role="option"]')).filter(o => (o.textContent || '').indexOf('4711') >= 0)[0];
    act(() => { (option as HTMLElement).click(); });

    expect(container.textContent).toContain('31,00 €'); // 2,5 x 12,40
    expect(container.textContent).toContain('36,89 €'); // brutto
    expect(container.textContent).toContain('Kostenstelle 4711:');

    act(() => { knopf(container, 'Zur Freigabe einreichen').click(); });
    await warten();
    expect(eingereicht).toHaveLength(1);
    expect(eingereicht[0].kostenstelleId).toBe(1);
    expect(eingereicht[0].positionen[0]).toEqual({
      bezeichnung: 'BNC-Kabel 1 m', menge: 2.5, einheit: 'Stk', einzelpreisNettoCent: 1240, mwstSatz: 19
    });
    expect(container.textContent).toContain('wurde eingereicht');
    expect(container.textContent).toContain('BANF-2026-00001');
  });
});
