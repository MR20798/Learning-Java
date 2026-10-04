import * as React from 'react';
import { DefaultButton, Dropdown, IconButton, IDropdownOption, Stack, Text, TextField } from '@fluentui/react';

import { centZuEuroText, euroZuCent, positionNettoCent } from '../../../domain/betraege';
import { IBanfPosition, MWST_SAETZE, MwStSatz } from '../../../domain/types';
import { MAX_POSITIONEN } from '../../../domain/validierung';
import styles from './BanfPortal.module.scss';

/** Eingabezeile; Menge und Preis bleiben Text, bis der Nutzer fertig getippt hat. */
export interface IPositionZeile {
  bezeichnung: string;
  menge: string;
  einheit: string;
  preis: string;
  mwstSatz: MwStSatz;
}

export const LEERE_ZEILE: IPositionZeile = { bezeichnung: '', menge: '1', einheit: 'Stk', preis: '', mwstSatz: 19 };

/** Ungültige Eingaben werden zu NaN und von der Validierung gemeldet. */
export function zeileZuPosition(zeile: IPositionZeile): IBanfPosition {
  const menge = /^\d+(,\d{1,3})?$/.test(zeile.menge.trim()) ? Number(zeile.menge.trim().replace(',', '.')) : NaN;
  const preis = euroZuCent(zeile.preis);
  return {
    bezeichnung: zeile.bezeichnung,
    menge,
    einheit: zeile.einheit,
    einzelpreisNettoCent: preis === undefined ? NaN : preis,
    mwstSatz: zeile.mwstSatz
  };
}

export function positionZuZeile(position: IBanfPosition): IPositionZeile {
  return {
    bezeichnung: position.bezeichnung,
    menge: String(position.menge).replace('.', ','),
    einheit: position.einheit,
    preis: centZuEuroText(position.einzelpreisNettoCent),
    mwstSatz: position.mwstSatz
  };
}

const MWST_OPTIONEN: IDropdownOption[] = MWST_SAETZE.map(s => ({ key: s, text: `${s} %` }));

export interface IPositionenEditorProps {
  zeilen: IPositionZeile[];
  fehler: Record<string, string>;
  deaktiviert: boolean;
  onChange: (zeilen: IPositionZeile[]) => void;
}

export const PositionenEditor: React.FC<IPositionenEditorProps> = ({ zeilen, fehler, deaktiviert, onChange }) => {
  const aendern = (index: number, teil: Partial<IPositionZeile>): void =>
    onChange(zeilen.map((z, i) => (i === index ? { ...z, ...teil } : z)));

  return (
    <Stack tokens={{ childrenGap: 8 }}>
      {zeilen.map((zeile, index) => {
        const position = zeileZuPosition(zeile);
        const wert = isNaN(position.menge) || isNaN(position.einzelpreisNettoCent) ? '' : centZuEuroText(positionNettoCent(position));
        return (
          <div key={index} className={styles.positionZeile}>
            <Stack horizontal wrap tokens={{ childrenGap: 8 }} verticalAlign="end">
              <TextField label={index === 0 ? 'Bezeichnung' : undefined} ariaLabel="Bezeichnung" className={styles.feldBreit}
                value={zeile.bezeichnung} disabled={deaktiviert} onChange={(_, v) => aendern(index, { bezeichnung: v || '' })} />
              <TextField label={index === 0 ? 'Menge' : undefined} ariaLabel="Menge" className={styles.feldSchmal}
                value={zeile.menge} disabled={deaktiviert} onChange={(_, v) => aendern(index, { menge: v || '' })} />
              <TextField label={index === 0 ? 'Einheit' : undefined} ariaLabel="Einheit" className={styles.feldSchmal}
                value={zeile.einheit} disabled={deaktiviert} onChange={(_, v) => aendern(index, { einheit: v || '' })} />
              <TextField label={index === 0 ? 'Einzelpreis netto (€)' : undefined} ariaLabel="Einzelpreis netto in Euro"
                className={styles.feldMittel} value={zeile.preis} placeholder="0,00" disabled={deaktiviert}
                onChange={(_, v) => aendern(index, { preis: v || '' })} />
              <Dropdown label={index === 0 ? 'MwSt' : undefined} ariaLabel="MwSt-Satz" className={styles.feldSchmal}
                options={MWST_OPTIONEN} selectedKey={zeile.mwstSatz} disabled={deaktiviert}
                onChange={(_, o) => o && aendern(index, { mwstSatz: o.key as MwStSatz })} />
              <Text className={styles.positionWert}>{wert ? `${wert} €` : '–'}</Text>
              <IconButton iconProps={{ iconName: 'Delete' }} title="Position entfernen" ariaLabel="Position entfernen"
                disabled={deaktiviert || zeilen.length === 1}
                onClick={() => onChange(zeilen.filter((_, i) => i !== index))} />
            </Stack>
            {fehler[`position.${index}`] && <Text className={styles.fehlerText}>{fehler[`position.${index}`]}</Text>}
          </div>
        );
      })}
      {fehler.positionen && <Text className={styles.fehlerText}>{fehler.positionen}</Text>}
      <div>
        <DefaultButton iconProps={{ iconName: 'Add' }} text="Position hinzufügen"
          disabled={deaktiviert || zeilen.length >= MAX_POSITIONEN}
          onClick={() => onChange([...zeilen, { ...LEERE_ZEILE }])} />
      </div>
    </Stack>
  );
};
