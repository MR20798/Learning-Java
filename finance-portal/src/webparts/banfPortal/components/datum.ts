import { DayOfWeek, IDatePickerStrings } from '@fluentui/react';
import { heuteIso } from '../../../services/mapper';

export const DATEPICKER_DE: IDatePickerStrings = {
  months: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
  shortMonths: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
  days: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
  shortDays: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
  goToToday: 'Heute',
  prevMonthAriaLabel: 'Vorheriger Monat',
  nextMonthAriaLabel: 'Nächster Monat',
  prevYearAriaLabel: 'Vorheriges Jahr',
  nextYearAriaLabel: 'Nächstes Jahr',
  closeButtonAriaLabel: 'Schließen',
  isRequiredErrorMessage: 'Pflichtfeld',
  invalidInputErrorMessage: 'Ungültiges Datum'
};

export const ERSTER_WOCHENTAG = DayOfWeek.Monday;

export function datumAnzeige(datum?: Date): string {
  return datum ? datum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
}

/** Eingabe "tt.mm.jjjj" -> Date (für allowTextInput). */
export function datumParsen(text: string): Date | null { // eslint-disable-line @rushstack/no-new-null
  const treffer = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(text.trim());
  if (!treffer) {
    return null;
  }
  const datum = new Date(Number(treffer[3]), Number(treffer[2]) - 1, Number(treffer[1]));
  return datum.getDate() === Number(treffer[1]) ? datum : null;
}

export function isoZuDate(iso: string): Date | undefined {
  if (!iso) {
    return undefined;
  }
  const [jahr, monat, tag] = iso.split('-').map(Number);
  return new Date(jahr, monat - 1, tag);
}

export function dateZuIso(datum: Date | null | undefined): string { // eslint-disable-line @rushstack/no-new-null
  return datum ? heuteIso(datum) : '';
}

/** Zeitstempel (ISO, UTC) -> "tt.mm.jjjj hh:mm" in lokaler Zeit. */
export function zeitpunktAnzeige(iso: string): string {
  if (!iso) {
    return '';
  }
  const datum = new Date(iso);
  if (isNaN(datum.getTime())) {
    return '';
  }
  return `${datumAnzeige(datum)} ${datum.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}
