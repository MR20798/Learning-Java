import * as React from 'react';
import { DatePicker, DefaultButton, MessageBar, MessageBarType, PrimaryButton, Spinner, SpinnerSize, Stack, Text } from '@fluentui/react';

import { formatEuro } from '../../../domain/betraege';
import { erzeugeCsv } from '../../../domain/csvExport';
import { IBanf } from '../../../domain/types';
import { BanfService } from '../../../services/BanfService';
import { heuteIso } from '../../../services/mapper';
import { BanfListe } from './BanfListe';
import { DATEPICKER_DE, dateZuIso, datumAnzeige, datumParsen, ERSTER_WOCHENTAG, isoZuDate } from './datum';
import styles from './BanfPortal.module.scss';

export interface IExportAnsichtProps {
  service: BanfService;
  onOeffnen: (banf: IBanf) => void;
}

/** Vormonat als Standardzeitraum. */
function vormonat(): { von: string; bis: string } {
  const jetzt = new Date();
  const von = new Date(jetzt.getFullYear(), jetzt.getMonth() - 1, 1);
  const bis = new Date(jetzt.getFullYear(), jetzt.getMonth(), 0);
  return { von: heuteIso(von), bis: heuteIso(bis) };
}

function herunterladen(inhalt: string, dateiname: string): void {
  const blob = new Blob([inhalt], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = dateiname;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const ExportAnsicht: React.FC<IExportAnsichtProps> = ({ service, onOeffnen }) => {
  const [zeitraum, setZeitraum] = React.useState(vormonat);
  const [banfs, setBanfs] = React.useState<IBanf[] | undefined>();
  const [laedt, setLaedt] = React.useState(false);
  const [meldung, setMeldung] = React.useState<{ typ: MessageBarType; text: string } | undefined>();

  const laden = async (): Promise<void> => {
    if (!zeitraum.von || !zeitraum.bis || zeitraum.von > zeitraum.bis) {
      setMeldung({ typ: MessageBarType.warning, text: 'Bitte einen gültigen Zeitraum wählen.' });
      return;
    }
    setLaedt(true);
    setMeldung(undefined);
    try {
      setBanfs(await service.ladeFreigegebene(zeitraum.von, zeitraum.bis));
    } catch (e) {
      setMeldung({ typ: MessageBarType.error, text: `Laden fehlgeschlagen: ${(e as Error).message}` });
    } finally {
      setLaedt(false);
    }
  };

  const exportieren = async (): Promise<void> => {
    if (!banfs || banfs.length === 0) {
      return;
    }
    herunterladen(erzeugeCsv(banfs), `BANF-Export_${zeitraum.von}_bis_${zeitraum.bis}.csv`);
    try {
      await service.protokolliereExport(zeitraum.von, zeitraum.bis, banfs);
      setMeldung({ typ: MessageBarType.success, text: `${banfs.length} BANF exportiert und im Exportprotokoll vermerkt.` });
    } catch (e) {
      setMeldung({ typ: MessageBarType.warning, text: `Export erstellt, aber Protokolleintrag fehlgeschlagen: ${(e as Error).message}` });
    }
  };

  const summeNetto = (banfs || []).reduce((s, b) => s + b.summeNettoCent, 0);

  return (
    <Stack tokens={{ childrenGap: 12 }}>
      <Text>Freigegebene BANF nach Freigabedatum exportieren (CSV für Excel, eine Zeile je Position).</Text>
      <Stack horizontal wrap tokens={{ childrenGap: 12 }} verticalAlign="end">
        <DatePicker label="Freigegeben von" className={styles.feldMittel} strings={DATEPICKER_DE} firstDayOfWeek={ERSTER_WOCHENTAG}
          formatDate={datumAnzeige} parseDateFromString={datumParsen} allowTextInput value={isoZuDate(zeitraum.von)}
          onSelectDate={d => setZeitraum(z => ({ ...z, von: dateZuIso(d) }))} />
        <DatePicker label="bis" className={styles.feldMittel} strings={DATEPICKER_DE} firstDayOfWeek={ERSTER_WOCHENTAG}
          formatDate={datumAnzeige} parseDateFromString={datumParsen} allowTextInput value={isoZuDate(zeitraum.bis)}
          onSelectDate={d => setZeitraum(z => ({ ...z, bis: dateZuIso(d) }))} />
        <DefaultButton text="Anzeigen" iconProps={{ iconName: 'Search' }} disabled={laedt} onClick={laden} />
        <PrimaryButton text="CSV herunterladen" iconProps={{ iconName: 'Download' }} disabled={laedt || !banfs || banfs.length === 0}
          onClick={exportieren} />
        {laedt && <Spinner size={SpinnerSize.small} />}
      </Stack>
      {meldung && <MessageBar messageBarType={meldung.typ} onDismiss={() => setMeldung(undefined)}>{meldung.text}</MessageBar>}
      {banfs && (
        <>
          <Text><strong>{banfs.length}</strong> BANF, Summe netto <strong>{formatEuro(summeNetto)}</strong></Text>
          <BanfListe banfs={banfs} leerText="Im Zeitraum wurden keine BANF freigegeben." zeigeAntragsteller onOeffnen={onOeffnen} />
        </>
      )}
    </Stack>
  );
};
