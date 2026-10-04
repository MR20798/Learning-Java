import * as React from 'react';
import { DefaultButton, Panel, PanelType, Separator, Stack, Text } from '@fluentui/react';

import { berechneSummen, centZuEuroText, formatEuro, positionNettoCent } from '../../../domain/betraege';
import { BanfStatus, IBanf } from '../../../domain/types';
import { datumAnzeige, isoZuDate, zeitpunktAnzeige } from './datum';
import { StatusBadge } from './StatusBadge';
import styles from './BanfPortal.module.scss';

export interface IBanfDetailsProps {
  banf: IBanf | undefined;
  /** Nur für eigene, abgelehnte oder freigegebene BANF angeboten. */
  onAlsVorlage: ((banf: IBanf) => void) | undefined;
  onSchliessen: () => void;
}

export const BanfDetails: React.FC<IBanfDetailsProps> = ({ banf, onAlsVorlage, onSchliessen }) => {
  if (!banf) {
    return null;
  }
  const summen = berechneSummen(banf.positionen);
  const kannVorlage = !!onAlsVorlage && (banf.status === BanfStatus.Abgelehnt || banf.status === BanfStatus.Freigegeben);

  return (
    <Panel isOpen type={PanelType.medium} headerText={`${banf.nummer} – ${banf.titel}`} onDismiss={onSchliessen}
      closeButtonAriaLabel="Schließen" isLightDismiss>
      <Stack tokens={{ childrenGap: 10 }}>
        <StatusBadge status={banf.status} />
        <dl className={styles.eigenschaften}>
          <dt>Antragsteller</dt><dd>{banf.antragsteller.displayName}</dd>
          <dt>Kostenstelle</dt><dd>{banf.kostenstelle}</dd>
          <dt>Lieferant</dt><dd>{banf.lieferant}</dd>
          <dt>Eingereicht</dt><dd>{zeitpunktAnzeige(banf.eingereichtAm)}</dd>
          {banf.wunschliefertermin && <><dt>Wunschliefertermin</dt><dd>{datumAnzeige(isoZuDate(banf.wunschliefertermin))}</dd></>}
          {banf.status === BanfStatus.InFreigabe && banf.aktuellerFreigeber &&
            <><dt>Liegt bei</dt><dd>{banf.aktuellerFreigeber.displayName} ({banf.aktuelleStufe})</dd></>}
          {banf.freigegebenAm && <><dt>Freigegeben</dt><dd>{zeitpunktAnzeige(banf.freigegebenAm)}</dd></>}
        </dl>
        <Text className={styles.begruendung}>{banf.begruendung}</Text>

        <Separator alignContent="start">Positionen</Separator>
        <table className={styles.tabelle}>
          <thead>
            <tr><th>Pos.</th><th>Bezeichnung</th><th>Menge</th><th>Einzelpreis</th><th>MwSt</th><th>Wert netto</th></tr>
          </thead>
          <tbody>
            {banf.positionen.map((p, i) => (
              <tr key={i}>
                <td>{i + 1}</td><td>{p.bezeichnung}</td>
                <td>{String(p.menge).replace('.', ',')} {p.einheit}</td>
                <td className={styles.zahl}>{centZuEuroText(p.einzelpreisNettoCent)}</td>
                <td>{p.mwstSatz} %</td>
                <td className={styles.zahl}>{centZuEuroText(positionNettoCent(p))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.summen}>
          <div><span>Summe netto</span><span>{formatEuro(banf.summeNettoCent)}</span></div>
          <div className={styles.summeBrutto}><span>Summe brutto</span><span>{formatEuro(banf.summeBruttoCent)}</span></div>
          {summen.nettoCent !== banf.summeNettoCent &&
            <Text className={styles.fehlerText}>Hinweis: Die Positionssumme weicht von der gespeicherten Summe ab.</Text>}
        </div>

        <Separator alignContent="start">Verlauf</Separator>
        {banf.verlauf.length === 0 && <Text>Noch keine Einträge.</Text>}
        <ul className={styles.verlauf}>
          {banf.verlauf.map((e, i) => (
            <li key={i}>
              <strong>{e.entscheidung}</strong> · {e.stufe} · {e.freigeber.displayName} · {zeitpunktAnzeige(e.zeitpunkt)}
              {e.kommentar && <div className={styles.hinweis}>„{e.kommentar}“</div>}
            </li>
          ))}
        </ul>

        {kannVorlage && (
          <div>
            <DefaultButton iconProps={{ iconName: 'Copy' }} text="Als Vorlage für neue BANF verwenden"
              onClick={() => onAlsVorlage!(banf)} />
          </div>
        )}
      </Stack>
    </Panel>
  );
};
