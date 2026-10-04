import { WebPartContext } from '@microsoft/sp-webpart-base';
import { spfi, SPFI, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/attachments';
import '@pnp/sp/site-users/web';
import '@pnp/sp/site-groups/web';

import { positionenZuJson } from '../domain/positionenJson';
import { BanfStatus, IBanf, IBanfEntwurf, IFreigabestufe, IKostenstelle, IPerson, IVertretung } from '../domain/types';
import { heuteIso, zuBanf, zuFreigabestufe, zuKostenstelle, zuVertretung } from './mapper';
import { FELDER, GRUPPE_BUCHHALTUNG, KONFIG_RUECKFALL_FREIGEBER, LISTEN } from './schema';

export interface IStammdaten {
  kostenstellen: IKostenstelle[];
  stufen: IFreigabestufe[];
  vertretungen: IVertretung[];
  rueckfallFreigeber: IPerson | undefined;
}

export interface IAktuellerBenutzer {
  id: number;
  person: IPerson;
  istBuchhaltung: boolean;
}

/** Eingereichter, vom Flow noch nicht übernommener Antrag. */
export interface IEingangEintrag {
  id: number;
  titel: string;
  erstelltAm: string;
}

const B = FELDER.banf;
const A = FELDER.antrag;

const BANF_FELDER: string[] = [
  'Id', A.titel, B.nummer, `${B.antragsteller}/Title`, `${B.antragsteller}/EMail`, B.kostenstelleNummer,
  A.lieferant, A.begruendung, A.wunschliefertermin, A.positionenJson, B.summeNetto, B.summeBrutto, B.status,
  B.aktuelleStufe, `${B.aktuellerFreigeber}/Title`, `${B.aktuellerFreigeber}/EMail`, B.eingereichtAm,
  B.freigegebenAm, B.verlaufJson
];
const BANF_EXPAND: string[] = [B.antragsteller, B.aktuellerFreigeber];

const SEITENGROESSE = 500;

/** OData-Stringliteral: einfache Anführungszeichen verdoppeln. */
function odataText(wert: string): string {
  return `'${wert.replace(/'/g, "''")}'`;
}

export class BanfService {
  private readonly _sp: SPFI;

  public constructor(context: WebPartContext, siteUrl?: string) {
    this._sp = (siteUrl ? spfi(siteUrl) : spfi()).using(SPFx(context));
  }

  public async ladeBenutzer(): Promise<IAktuellerBenutzer> {
    const [benutzer, gruppen] = await Promise.all([
      this._sp.web.currentUser.select('Id', 'Title', 'Email')(),
      this._sp.web.currentUser.groups.select('Title')()
    ]);
    return {
      id: benutzer.Id,
      person: { email: benutzer.Email, displayName: benutzer.Title },
      istBuchhaltung: gruppen.some(g => g.Title === GRUPPE_BUCHHALTUNG)
    };
  }

  public async ladeStammdaten(): Promise<IStammdaten> {
    const K = FELDER.kostenstelle;
    const S = FELDER.freigabestufe;
    const V = FELDER.vertretung;
    const C = FELDER.konfiguration;
    // Ein Tag Puffer: "nur Datum" steht in UTC als Vortag 22:00/23:00 (siehe datumsfeldZuIso).
    const gestern = new Date();
    gestern.setDate(gestern.getDate() - 1);

    const [kostenstellen, stufen, vertretungen, konfiguration] = await Promise.all([
      this._alle(this._sp.web.lists.getByTitle(LISTEN.kostenstellen).items
        .select('Id', K.nummer, K.bezeichnung, K.aktiv, `${K.verantwortlicher}/Title`, `${K.verantwortlicher}/EMail`)
        .expand(K.verantwortlicher)
        .orderBy(K.nummer)),
      this._alle(this._sp.web.lists.getByTitle(LISTEN.freigabestufen).items
        .select('Id', S.bezeichnung, S.reihenfolge, S.abBetragNetto, S.aktiv, `${S.kostenstellen}Id`,
          `${S.freigeber}/Title`, `${S.freigeber}/EMail`)
        .expand(S.freigeber)),
      // Nur Vertretungen, die nicht schon länger beendet sind; die genaue Prüfung macht die Fachlogik.
      this._alle(this._sp.web.lists.getByTitle(LISTEN.vertretungen).items
        .select('Id', V.von, V.bis, 'Author/Title', 'Author/EMail', `${V.vertreter}/Title`, `${V.vertreter}/EMail`)
        .expand('Author', V.vertreter)
        .filter(`${V.bis} ge datetime'${heuteIso(gestern)}T00:00:00Z'`)),
      this._sp.web.lists.getByTitle(LISTEN.konfiguration).items
        .select(C.schluessel, `${C.person}/Title`, `${C.person}/EMail`)
        .expand(C.person)
        .filter(`${C.schluessel} eq ${odataText(KONFIG_RUECKFALL_FREIGEBER)}`)
        .top(1)()
    ]);

    const rueckfall = konfiguration[0] && konfiguration[0][C.person];
    return {
      kostenstellen: kostenstellen.map(zuKostenstelle),
      stufen: stufen.map(zuFreigabestufe),
      vertretungen: vertretungen.map(zuVertretung).filter((v): v is IVertretung => !!v),
      rueckfallFreigeber: rueckfall && rueckfall.EMail
        ? { email: rueckfall.EMail, displayName: rueckfall.Title }
        : undefined
    };
  }

  /**
   * Legt den Antrag in der Eingangsliste ab. Der Flow übernimmt ihn von dort in
   * die geschützte Liste "Bestellanforderungen", berechnet die Summen neu und
   * startet die Freigabe. Antragsteller ist immer "Erstellt von" des Eingangs.
   */
  public async reicheEin(entwurf: IBanfEntwurf, anhaenge: File[]): Promise<number> {
    const eingang = this._sp.web.lists.getByTitle(LISTEN.eingang);
    const angelegt = await eingang.items.add({
      [A.titel]: entwurf.titel.trim(),
      [`${A.kostenstelle}Id`]: entwurf.kostenstelleId,
      [A.lieferant]: entwurf.lieferant.trim(),
      [A.begruendung]: entwurf.begruendung.trim(),
      [A.wunschliefertermin]: entwurf.wunschliefertermin ? `${entwurf.wunschliefertermin}T12:00:00Z` : null,
      [A.positionenJson]: positionenZuJson(entwurf.positionen),
      [FELDER.eingang.bereit]: false
    });

    // Erst nach dem Hochladen aller Anhänge freigeben, sonst könnte der Flow sie verpassen.
    const item = eingang.items.getById(angelegt.Id);
    try {
      for (const datei of anhaenge) {
        await item.attachmentFiles.add(datei.name, await datei.arrayBuffer());
      }
      await item.update({ [FELDER.eingang.bereit]: true });
    } catch (e) {
      await item.recycle().catch(() => undefined);
      throw e;
    }
    return angelegt.Id;
  }

  /** Eigene Anträge, die der Flow noch nicht übernommen hat (Eingangsliste zeigt nur eigene Einträge). */
  public async ladeOffeneEingaenge(): Promise<IEingangEintrag[]> {
    const items = await this._sp.web.lists.getByTitle(LISTEN.eingang).items
      .select('Id', 'Title', 'Created')
      .orderBy('Created', false)
      .top(100)();
    return items.map(i => ({ id: i.Id, titel: i.Title, erstelltAm: i.Created }));
  }

  public async ladeMeineBanfs(benutzerId: number): Promise<IBanf[]> {
    return this._ladeBanfs(`${B.antragsteller}Id eq ${benutzerId}`);
  }

  public async ladeBeiMirZurFreigabe(benutzerId: number): Promise<IBanf[]> {
    return this._ladeBanfs(`${B.aktuellerFreigeber}Id eq ${benutzerId} and ${B.status} eq ${odataText(BanfStatus.InFreigabe)}`);
  }

  /** Freigegebene BANF mit Freigabedatum im Zeitraum [von, bis] (lokale Kalendertage, inklusiv). */
  public async ladeFreigegebene(von: string, bis: string): Promise<IBanf[]> {
    const start = new Date(`${von}T00:00:00`).toISOString();
    const ende = new Date(`${bis}T00:00:00`);
    ende.setDate(ende.getDate() + 1);
    return this._ladeBanfs(
      `${B.status} eq ${odataText(BanfStatus.Freigegeben)}`
      + ` and ${B.freigegebenAm} ge datetime'${start}' and ${B.freigegebenAm} lt datetime'${ende.toISOString()}'`,
      B.freigegebenAm);
  }

  public async protokolliereExport(von: string, bis: string, banfs: IBanf[]): Promise<void> {
    const E = FELDER.exportprotokoll;
    const summe = berechneSummeNetto(banfs);
    await this._sp.web.lists.getByTitle(LISTEN.exportprotokoll).items.add({
      Title: `Export ${von} bis ${bis} (${banfs.length} BANF, netto ${(summe / 100).toFixed(2)} EUR)`,
      [E.zeitraumVon]: `${von}T12:00:00Z`,
      [E.zeitraumBis]: `${bis}T12:00:00Z`,
      [E.anzahl]: banfs.length,
      [E.banfNummern]: banfs.map(b => b.nummer).join(', ')
    });
  }

  private async _ladeBanfs(filter: string, sortierung: string = 'Created'): Promise<IBanf[]> {
    const items = await this._alle(this._sp.web.lists.getByTitle(LISTEN.bestellanforderungen).items
      .select(...BANF_FELDER)
      .expand(...BANF_EXPAND)
      .filter(filter)
      .orderBy(sortierung, false));
    return items.map(zuBanf);
  }

  /** Liest alle Seiten einer Abfrage (PnPjs v4: Items-Collections sind async iterierbar). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _alle(abfrage: any): Promise<any[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ergebnis: any[] = [];
    for await (const seite of abfrage.top(SEITENGROESSE)) {
      ergebnis.push(...seite);
    }
    return ergebnis;
  }
}

function berechneSummeNetto(banfs: IBanf[]): number {
  return banfs.reduce((summe, b) => summe + b.summeNettoCent, 0);
}
