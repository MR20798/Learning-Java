import * as React from 'react';
import {
  DatePicker, DefaultButton, Dropdown, IconButton, IDropdownOption, Label, MessageBar, MessageBarType, PrimaryButton,
  Separator, Spinner, SpinnerSize, Stack, Text, TextField
} from '@fluentui/react';

import { berechneSummen, formatEuro } from '../../../domain/betraege';
import { ermittleFreigabeweg, IFreigabeweg } from '../../../domain/freigabeweg';
import { IBanfEntwurf } from '../../../domain/types';
import { istGueltig, validiereEntwurf, ValidierungsFehler } from '../../../domain/validierung';
import { IAktuellerBenutzer, IStammdaten } from '../../../services/BanfService';
import { heuteIso } from '../../../services/mapper';
import { DATEPICKER_DE, dateZuIso, datumAnzeige, datumParsen, ERSTER_WOCHENTAG, isoZuDate } from './datum';
import { IPositionZeile, LEERE_ZEILE, PositionenEditor, positionZuZeile, zeileZuPosition } from './PositionenEditor';
import { FreigabewegVorschau } from './FreigabewegVorschau';
import styles from './BanfPortal.module.scss';

const MAX_ANHANG_BYTES = 10 * 1024 * 1024;
const ERLAUBTE_ENDUNGEN = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.xlsx', '.msg', '.eml'];

export interface IBanfFormularProps {
  stammdaten: IStammdaten;
  benutzer: IAktuellerBenutzer;
  /** Optionale Vorlage, z. B. aus "Als Vorlage verwenden" einer abgelehnten BANF. */
  vorlage: IBanfEntwurf | undefined;
  onEinreichen: (entwurf: IBanfEntwurf, anhaenge: File[]) => Promise<void>;
}

interface IFormularWerte {
  titel: string;
  kostenstelleId: number | undefined;
  lieferant: string;
  begruendung: string;
  wunschliefertermin: string;
  zeilen: IPositionZeile[];
}

function ausVorlage(vorlage: IBanfEntwurf | undefined): IFormularWerte {
  if (!vorlage) {
    return { titel: '', kostenstelleId: undefined, lieferant: '', begruendung: '', wunschliefertermin: '', zeilen: [{ ...LEERE_ZEILE }] };
  }
  return {
    titel: vorlage.titel,
    kostenstelleId: vorlage.kostenstelleId,
    lieferant: vorlage.lieferant,
    begruendung: vorlage.begruendung,
    wunschliefertermin: vorlage.wunschliefertermin >= heuteIso() ? vorlage.wunschliefertermin : '',
    zeilen: vorlage.positionen.length > 0 ? vorlage.positionen.map(positionZuZeile) : [{ ...LEERE_ZEILE }]
  };
}

function pruefeAnhang(datei: File): string | undefined {
  const name = datei.name.toLowerCase();
  if (!ERLAUBTE_ENDUNGEN.some(e => name.slice(-e.length) === e)) {
    return `${datei.name}: Dateityp nicht erlaubt (${ERLAUBTE_ENDUNGEN.join(', ')}).`;
  }
  if (datei.size > MAX_ANHANG_BYTES) {
    return `${datei.name}: Datei ist größer als 10 MB.`;
  }
  return undefined;
}

export const BanfFormular: React.FC<IBanfFormularProps> = ({ stammdaten, benutzer, vorlage, onEinreichen }) => {
  const [werte, setWerte] = React.useState<IFormularWerte>(() => ausVorlage(vorlage));
  const [anhaenge, setAnhaenge] = React.useState<File[]>([]);
  const [fehler, setFehler] = React.useState<ValidierungsFehler>({});
  const [anhangFehler, setAnhangFehler] = React.useState<string[]>([]);
  const [sendet, setSendet] = React.useState(false);
  const [sendeFehler, setSendeFehler] = React.useState<string | undefined>();
  const dateiInput = React.useRef<HTMLInputElement>(null);
  // Nach erfolgreichem Einreichen wechselt das Portal den Reiter und hängt das Formular aus.
  const eingehaengt = React.useRef(true);
  React.useEffect(() => () => { eingehaengt.current = false; }, []);

  React.useEffect(() => {
    setWerte(ausVorlage(vorlage));
    setFehler({});
  }, [vorlage]);

  const entwurf: IBanfEntwurf = React.useMemo(() => ({
    titel: werte.titel,
    kostenstelleId: werte.kostenstelleId,
    lieferant: werte.lieferant,
    begruendung: werte.begruendung,
    wunschliefertermin: werte.wunschliefertermin,
    positionen: werte.zeilen.map(zeileZuPosition)
  }), [werte]);

  const gueltigePositionen = entwurf.positionen.filter(p => !isNaN(p.menge) && !isNaN(p.einzelpreisNettoCent));
  const summen = berechneSummen(gueltigePositionen);
  const kostenstelle = stammdaten.kostenstellen.filter(k => k.id === werte.kostenstelleId)[0];

  const weg: IFreigabeweg | undefined = kostenstelle
    ? ermittleFreigabeweg({
      antragsteller: benutzer.person,
      kostenstelle,
      nettoCent: summen.nettoCent,
      stufen: stammdaten.stufen,
      vertretungen: stammdaten.vertretungen,
      stichtag: heuteIso(),
      rueckfallFreigeber: stammdaten.rueckfallFreigeber
    })
    : undefined;

  const kostenstellenOptionen: IDropdownOption[] = stammdaten.kostenstellen
    .filter(k => k.aktiv)
    .map(k => ({ key: k.id, text: `${k.nummer} – ${k.bezeichnung}` }));

  const setze = (teil: Partial<IFormularWerte>): void => setWerte(w => ({ ...w, ...teil }));

  const dateienGewaehlt = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const neu = Array.from(event.target.files || []);
    const meldungen = neu.map(pruefeAnhang).filter((m): m is string => !!m);
    setAnhangFehler(meldungen);
    setAnhaenge(a => [...a, ...neu.filter(d => !pruefeAnhang(d) && !a.some(x => x.name === d.name))]);
    event.target.value = '';
  };

  const einreichen = async (): Promise<void> => {
    const ergebnis = validiereEntwurf(entwurf, stammdaten.kostenstellen, heuteIso());
    setFehler(ergebnis);
    setSendeFehler(undefined);
    if (!istGueltig(ergebnis) || (weg && weg.fehler)) {
      return;
    }
    setSendet(true);
    try {
      await onEinreichen(entwurf, anhaenge);
      if (eingehaengt.current) {
        setWerte(ausVorlage(undefined));
        setAnhaenge([]);
      }
    } catch (e) {
      if (eingehaengt.current) {
        setSendeFehler(`Die BANF konnte nicht gespeichert werden: ${(e as Error).message}`);
      }
    } finally {
      if (eingehaengt.current) {
        setSendet(false);
      }
    }
  };

  return (
    <Stack tokens={{ childrenGap: 12 }} className={styles.formular}>
      <TextField label="Titel" required value={werte.titel} errorMessage={fehler.titel} disabled={sendet}
        placeholder="z. B. Oszilloskop für Prüfplatz 3" onChange={(_, v) => setze({ titel: v || '' })} />
      <Stack horizontal wrap tokens={{ childrenGap: 12 }}>
        <Dropdown label="Kostenstelle" required className={styles.feldMittelBreit} options={kostenstellenOptionen}
          selectedKey={werte.kostenstelleId === undefined ? null : werte.kostenstelleId}
          errorMessage={fehler.kostenstelle} disabled={sendet} placeholder="Kostenstelle wählen"
          onChange={(_, o) => o && setze({ kostenstelleId: o.key as number })} />
        <TextField label="Lieferant" required className={styles.feldMittelBreit} value={werte.lieferant}
          errorMessage={fehler.lieferant} disabled={sendet} onChange={(_, v) => setze({ lieferant: v || '' })} />
        <DatePicker label="Wunschliefertermin" className={styles.feldMittel} strings={DATEPICKER_DE}
          firstDayOfWeek={ERSTER_WOCHENTAG} formatDate={datumAnzeige} parseDateFromString={datumParsen} allowTextInput
          minDate={new Date()} value={isoZuDate(werte.wunschliefertermin)} disabled={sendet}
          onSelectDate={d => setze({ wunschliefertermin: dateZuIso(d) })} />
      </Stack>
      {fehler.wunschliefertermin && <Text className={styles.fehlerText}>{fehler.wunschliefertermin}</Text>}
      <TextField label="Begründung des Bedarfs" required multiline rows={3} value={werte.begruendung}
        errorMessage={fehler.begruendung} disabled={sendet} onChange={(_, v) => setze({ begruendung: v || '' })} />

      <Separator alignContent="start">Positionen</Separator>
      <PositionenEditor zeilen={werte.zeilen} fehler={fehler} deaktiviert={sendet} onChange={zeilen => setze({ zeilen })} />

      <div className={styles.summen}>
        <div><span>Summe netto</span><span>{formatEuro(summen.nettoCent)}</span></div>
        {summen.steuerJeSatz.map(z => (
          <div key={z.satz}><span>USt {z.satz} % auf {formatEuro(z.nettoCent)}</span><span>{formatEuro(z.steuerCent)}</span></div>
        ))}
        <div className={styles.summeBrutto}><span>Summe brutto</span><span>{formatEuro(summen.bruttoCent)}</span></div>
      </div>

      <Separator alignContent="start">Anhänge (z. B. Angebot)</Separator>
      <Stack tokens={{ childrenGap: 4 }}>
        <input ref={dateiInput} type="file" multiple hidden accept={ERLAUBTE_ENDUNGEN.join(',')} onChange={dateienGewaehlt} />
        <div>
          <DefaultButton iconProps={{ iconName: 'Attach' }} text="Datei anhängen" disabled={sendet}
            onClick={() => dateiInput.current && dateiInput.current.click()} />
        </div>
        {anhaenge.map(d => (
          <Stack key={d.name} horizontal verticalAlign="center">
            <Text>{d.name} ({Math.ceil(d.size / 1024)} KB)</Text>
            <IconButton iconProps={{ iconName: 'Cancel' }} title="Entfernen" ariaLabel={`${d.name} entfernen`} disabled={sendet}
              onClick={() => setAnhaenge(a => a.filter(x => x !== d))} />
          </Stack>
        ))}
        {anhangFehler.map(m => <Text key={m} className={styles.fehlerText}>{m}</Text>)}
      </Stack>

      <Separator alignContent="start">Voraussichtlicher Freigabeweg</Separator>
      <FreigabewegVorschau weg={weg} />

      {sendeFehler && <MessageBar messageBarType={MessageBarType.error}>{sendeFehler}</MessageBar>}
      {!istGueltig(fehler) && <MessageBar messageBarType={MessageBarType.warning}>Bitte die markierten Angaben prüfen.</MessageBar>}

      <Stack horizontal wrap tokens={{ childrenGap: 8 }} verticalAlign="center">
        <PrimaryButton text="Zur Freigabe einreichen" className={styles.knopf} disabled={sendet} onClick={einreichen} />
        <DefaultButton text="Verwerfen" disabled={sendet} onClick={() => { setWerte(ausVorlage(undefined)); setAnhaenge([]); setFehler({}); }} />
        {sendet && <Spinner size={SpinnerSize.small} label="Wird gespeichert …" labelPosition="right" />}
      </Stack>
      <Label className={styles.hinweis}>
        Nach dem Einreichen kann die BANF nicht mehr geändert werden. Die Freigeber erhalten die Anfrage in Teams und Outlook.
      </Label>
    </Stack>
  );
};
