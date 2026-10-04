import { IFreigabestufe, IKostenstelle, IPerson, IVertretung } from './types';

/**
 * Ermittelt den Freigabeweg einer BANF.
 *
 * Diese Funktion ist die Referenz-Implementierung der Freigaberegeln. Der
 * Power-Automate-Flow "BANF Freigabe" bildet exakt dieselben Regeln ab
 * (siehe docs/flow-banf-freigabe.md); das Webpart nutzt sie für die Vorschau
 * "Voraussichtlicher Freigabeweg". Verbindlich ist immer der Flow, da
 * clientseitige Berechnungen manipulierbar sind.
 *
 * Regeln:
 *  1. Stufe 1 ist immer der Verantwortliche der Kostenstelle.
 *  2. Dazu kommen alle aktiven Freigabestufen, deren Betragsgrenze (netto)
 *     erreicht ist und die für die Kostenstelle gelten, sortiert nach Reihenfolge.
 *  3. Vertretung: Ist für den vorgesehenen Freigeber am Stichtag eine
 *     Vertretung eingetragen, genehmigt der Vertreter.
 *  4. Vier-Augen-Prinzip: Der Antragsteller genehmigt nie selbst.
 *     - Wäre der Vertreter der Antragsteller, genehmigt der vorgesehene Freigeber.
 *     - Ist der vorgesehene Freigeber der Antragsteller, genehmigt sein Vertreter
 *       (falls am Stichtag eingetragen), sonst entfällt die Stufe und die
 *       Freigabe geht an die nächsthöhere Stufe.
 *  5. Hat dieselbe Person bereits eine frühere Stufe genehmigt, wird die
 *     spätere Stufe übersprungen (keine Doppelfreigabe durch eine Person).
 *  6. Bleibt keine Stufe mit Freigeber übrig, genehmigt der Rückfall-Freigeber
 *     aus der Konfiguration.
 */

export type SchrittStatus = 'offen' | 'übersprungen';

export interface IFreigabeSchritt {
  stufe: string;
  vorgesehen: IPerson;
  /** Tatsächlicher Freigeber; undefined bei übersprungenen Stufen. */
  freigeber: IPerson | undefined;
  status: SchrittStatus;
  hinweis: string;
}

export interface IFreigabewegEingabe {
  antragsteller: IPerson;
  kostenstelle: IKostenstelle;
  nettoCent: number;
  stufen: IFreigabestufe[];
  vertretungen: IVertretung[];
  /** ISO-Datum (yyyy-mm-dd), an dem die Vertretungen geprüft werden. */
  stichtag: string;
  rueckfallFreigeber: IPerson | undefined;
}

export interface IFreigabeweg {
  schritte: IFreigabeSchritt[];
  /** Gesetzt, wenn kein gültiger Freigabeweg ermittelt werden konnte. */
  fehler: string | undefined;
}

export function istGleichePerson(a: IPerson | undefined, b: IPerson | undefined): boolean {
  return !!a && !!b && a.email.trim().toLowerCase() === b.email.trim().toLowerCase();
}

export function findeVertreter(person: IPerson, vertretungen: IVertretung[], stichtag: string): IPerson | undefined {
  const treffer = vertretungen.find(v =>
    istGleichePerson(v.freigeber, person) && v.von <= stichtag && stichtag <= v.bis);
  return treffer ? treffer.vertreter : undefined;
}

export function relevanteStufen(stufen: IFreigabestufe[], kostenstelleId: number, nettoCent: number): IFreigabestufe[] {
  return stufen
    .filter(s => s.aktiv
      && nettoCent >= s.abBetragNettoCent
      && (s.kostenstellenIds.length === 0 || s.kostenstellenIds.indexOf(kostenstelleId) >= 0))
    .sort((a, b) => a.reihenfolge - b.reihenfolge);
}

export function ermittleFreigabeweg(eingabe: IFreigabewegEingabe): IFreigabeweg {
  const { antragsteller, kostenstelle, vertretungen, stichtag } = eingabe;

  if (!kostenstelle.aktiv) {
    return { schritte: [], fehler: `Die Kostenstelle ${kostenstelle.nummer} ist nicht aktiv.` };
  }

  const vorgesehen: Array<{ stufe: string; person: IPerson }> = [
    { stufe: `Kostenstelle ${kostenstelle.nummer}`, person: kostenstelle.verantwortlicher },
    ...relevanteStufen(eingabe.stufen, kostenstelle.id, eingabe.nettoCent)
      .map(s => ({ stufe: s.bezeichnung, person: s.freigeber }))
  ];

  const schritte: IFreigabeSchritt[] = [];
  const bereitsFreigebend: IPerson[] = [];
  /** Eine Stufe ist wegen des Vier-Augen-Prinzips entfallen und wartet auf eine höhere Stufe. */
  let eskalationOffen = false;

  for (const { stufe, person } of vorgesehen) {
    const vertreter = findeVertreter(person, vertretungen, stichtag);
    let freigeber: IPerson | undefined;
    let hinweis = '';

    if (istGleichePerson(person, antragsteller)) {
      if (vertreter && !istGleichePerson(vertreter, antragsteller)) {
        freigeber = vertreter;
        hinweis = 'Vier-Augen-Prinzip: Vertreter genehmigt anstelle des Antragstellers.';
      } else {
        schritte.push({
          stufe, vorgesehen: person, freigeber: undefined, status: 'übersprungen',
          hinweis: 'Vier-Augen-Prinzip: Antragsteller kann nicht selbst genehmigen, Freigabe geht an die nächste Stufe.'
        });
        eskalationOffen = true;
        continue;
      }
    } else if (vertreter && !istGleichePerson(vertreter, antragsteller)) {
      freigeber = vertreter;
      hinweis = `Vertretung für ${person.displayName}.`;
    } else {
      freigeber = person;
      if (vertreter) {
        hinweis = 'Vertreter ist der Antragsteller, daher genehmigt der vorgesehene Freigeber.';
      }
    }

    if (bereitsFreigebend.some(p => istGleichePerson(p, freigeber))) {
      schritte.push({
        stufe, vorgesehen: person, freigeber: undefined, status: 'übersprungen',
        hinweis: `${freigeber.displayName} hat bereits in einer früheren Stufe genehmigt.`
      });
      continue;
    }

    bereitsFreigebend.push(freigeber);
    schritte.push({ stufe, vorgesehen: person, freigeber, status: 'offen', hinweis });
    eskalationOffen = false;
  }

  if (bereitsFreigebend.length === 0 || eskalationOffen) {
    const rueckfall = eingabe.rueckfallFreigeber;
    if (!rueckfall || istGleichePerson(rueckfall, antragsteller)) {
      return { schritte, fehler: 'Es konnte kein Freigeber ermittelt werden, der nicht der Antragsteller ist.' };
    }
    if (!bereitsFreigebend.some(p => istGleichePerson(p, rueckfall))) {
      schritte.push({
        stufe: 'Rückfall-Freigabe', vorgesehen: rueckfall, freigeber: rueckfall, status: 'offen',
        hinweis: 'Die höchste erforderliche Stufe kann nicht durch den Antragsteller genehmigt werden.'
      });
    }
  }

  return { schritte, fehler: undefined };
}
