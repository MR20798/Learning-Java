import * as React from 'react';
import { Icon, MessageBar, MessageBarType, Stack, Text } from '@fluentui/react';

import { IFreigabeweg } from '../../../domain/freigabeweg';
import styles from './BanfPortal.module.scss';

export interface IFreigabewegVorschauProps {
  weg: IFreigabeweg | undefined;
}

export const FreigabewegVorschau: React.FC<IFreigabewegVorschauProps> = ({ weg }) => {
  if (!weg) {
    return <Text variant="small">Der Freigabeweg wird angezeigt, sobald eine Kostenstelle gewählt ist.</Text>;
  }
  if (weg.fehler) {
    return <MessageBar messageBarType={MessageBarType.error}>{weg.fehler}</MessageBar>;
  }
  return (
    <Stack tokens={{ childrenGap: 6 }}>
      <ol className={styles.freigabeweg}>
        {weg.schritte.map((schritt, index) => (
          <li key={index} className={schritt.status === 'übersprungen' ? styles.uebersprungen : undefined}>
            <Icon iconName={schritt.status === 'übersprungen' ? 'Blocked2' : 'Contact'} />{' '}
            <strong>{schritt.stufe}:</strong>{' '}
            {schritt.freigeber ? schritt.freigeber.displayName : schritt.vorgesehen.displayName}
            {schritt.hinweis && <div className={styles.hinweis}>{schritt.hinweis}</div>}
          </li>
        ))}
      </ol>
      <Text variant="small">
        Vorschau. Verbindlich ermittelt der Workflow den Freigabeweg beim Einreichen, inklusive der dann gültigen Vertretungen.
      </Text>
    </Stack>
  );
};
