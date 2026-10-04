import * as React from 'react';

import { BanfStatus } from '../../../domain/types';
import styles from './BanfPortal.module.scss';

const KLASSE: Record<BanfStatus, string> = {
  [BanfStatus.Eingereicht]: styles.statusNeutral,
  [BanfStatus.InFreigabe]: styles.statusOffen,
  [BanfStatus.Freigegeben]: styles.statusOk,
  [BanfStatus.Abgelehnt]: styles.statusFehler,
  [BanfStatus.Fehler]: styles.statusFehler
};

export const StatusBadge: React.FC<{ status: BanfStatus }> = ({ status }) =>
  <span className={`${styles.status} ${KLASSE[status]}`}>{status}</span>;
