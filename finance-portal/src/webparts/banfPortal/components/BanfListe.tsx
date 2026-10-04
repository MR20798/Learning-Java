import * as React from 'react';
import { DetailsList, DetailsListLayoutMode, IColumn, Link, SelectionMode, Text } from '@fluentui/react';

import { formatEuro } from '../../../domain/betraege';
import { BanfStatus, IBanf } from '../../../domain/types';
import { zeitpunktAnzeige } from './datum';
import { StatusBadge } from './StatusBadge';
import styles from './BanfPortal.module.scss';

export interface IBanfListeProps {
  banfs: IBanf[];
  leerText: string;
  /** Spalte "Antragsteller" statt "Liegt bei" (z. B. in der Freigabe-Ansicht). */
  zeigeAntragsteller: boolean;
  onOeffnen: (banf: IBanf) => void;
}

export const BanfListe: React.FC<IBanfListeProps> = ({ banfs, leerText, zeigeAntragsteller, onOeffnen }) => {
  const spalten: IColumn[] = [
    {
      key: 'nummer', name: 'BANF-Nr.', minWidth: 120, maxWidth: 140,
      onRender: (b: IBanf) => <Link onClick={() => onOeffnen(b)}>{b.nummer}</Link>
    },
    { key: 'titel', name: 'Titel', fieldName: 'titel', minWidth: 160, isMultiline: true },
    { key: 'kst', name: 'Kostenstelle', fieldName: 'kostenstelle', minWidth: 80, maxWidth: 100 },
    {
      key: 'netto', name: 'Netto', minWidth: 90, maxWidth: 120,
      onRender: (b: IBanf) => <span className={styles.zahl}>{formatEuro(b.summeNettoCent)}</span>
    },
    { key: 'status', name: 'Status', minWidth: 100, maxWidth: 120, onRender: (b: IBanf) => <StatusBadge status={b.status} /> },
    zeigeAntragsteller
      ? { key: 'antragsteller', name: 'Antragsteller', minWidth: 120, onRender: (b: IBanf) => b.antragsteller.displayName }
      : {
        key: 'liegtBei', name: 'Liegt bei', minWidth: 140,
        onRender: (b: IBanf) => b.status === BanfStatus.InFreigabe && b.aktuellerFreigeber
          ? `${b.aktuellerFreigeber.displayName} (${b.aktuelleStufe})` : ''
      },
    { key: 'eingereicht', name: 'Eingereicht', minWidth: 120, maxWidth: 140, onRender: (b: IBanf) => zeitpunktAnzeige(b.eingereichtAm) }
  ];

  if (banfs.length === 0) {
    return <Text className={styles.leer}>{leerText}</Text>;
  }

  return (
    <DetailsList items={banfs} columns={spalten} selectionMode={SelectionMode.none} layoutMode={DetailsListLayoutMode.justified}
      onItemInvoked={onOeffnen} getKey={(b: IBanf) => String(b.id)} setKey="banfs" />
  );
};
