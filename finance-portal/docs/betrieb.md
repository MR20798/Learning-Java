# Einführung und Betrieb

## Einführung in dieser Reihenfolge

1. **Website** anlegen (Kommunikations- oder Teamwebsite, z. B. `/sites/Finanzen`), Sprache Deutsch,
   Zeitzone `(UTC+01:00) Amsterdam, Berlin, …`.
2. **Listen und Rechte** anlegen: `provisioning/Deploy-BanfListen.ps1` (siehe Kopf des Skripts).
3. **Gruppen befüllen**: `BANF Buchhaltung` (Export, liest alle BANF), `BANF Administration` (pflegt Stammdaten).
4. **Stammdaten** pflegen:
   - `BanfKostenstellen`: Nummer, Bezeichnung, Verantwortlicher, Aktiv
   - `BanfFreigabestufen`: z. B. „Bereichsleitung“ (Reihenfolge 10, ab 5.000 €), „Geschäftsführung“ (20, ab 25.000 €);
     Feld „Nur für Kostenstellen“ leer lassen, wenn die Stufe überall gilt
   - `BanfKonfiguration`: `RueckfallFreigeber` (Person) und `Aufbewahrungslabel` (Name des Labels) prüfen
5. **Aufbewahrungslabel** in Microsoft Purview anlegen (siehe unten) und auf die Website veröffentlichen.
6. **Flow** nach [flow-banf-freigabe.md](flow-banf-freigabe.md) bauen und die Testfälle durchspielen.
7. **App bereitstellen**: `sharepoint/solution/banf-portal.sppkg` in den App-Katalog des Tenants hochladen
   („Diese Lösung für alle Websites verfügbar machen“ ist aktiviert, `skipFeatureDeployment`).
8. **Seite** „Bestellanforderungen“ auf der Website anlegen, Webpart „Bestellanforderungen (BANF)“ einfügen,
   Seite als Vollbreite-Abschnitt anlegen.
9. **Teams**: Im App-Katalog bei der Lösung „Mit Teams synchronisieren“ wählen. Danach lässt sich das Webpart als
   Tab in einem Kanal oder als persönliche App hinzufügen. Läuft der Tab in einem **anderen Team** als der
   Finanz-Website, in den Webpart-Eigenschaften die „Website-URL der BANF-Listen“ eintragen.
10. **Pilot** mit einer Kostenstelle, danach Freigabe für alle.

## Aufbewahrung (GoBD)

| Anforderung | Umsetzung |
|---|---|
| Unveränderbarkeit nach Freigabe | Retention-Label, das das Element **als Datensatz kennzeichnet**; vom Flow nach Abschluss gesetzt |
| Aufbewahrung 10 Jahre | Label-Einstellung „10 Jahre ab Kennzeichnung“ (bzw. nach interner Aufbewahrungsrichtlinie) |
| Nachvollziehbarkeit | Versionsverlauf der Liste (500 Hauptversionen), Verlauf je BANF (`VerlaufJson`), Approvals-Verlauf, Exportprotokoll |
| Belege | Anhänge der BANF erben die Datensatz-Kennzeichnung |

Label anlegen (Purview-Portal → Datensatzverwaltung → Dateiplan):

- Name: wie in `BanfKonfiguration/Aufbewahrungslabel` (Standard: „Finanzbeleg 10 Jahre“)
- Aufbewahren für 10 Jahre, Start „Wann Elemente bezeichnet wurden“
- „Elemente als Datensatz kennzeichnen“ (nicht „gesetzlicher Datensatz“, sonst kann niemand mehr etwas korrigieren)
- Danach: Aufbewahren beenden oder Prüfung durch die Buchhaltung

Ob die BANF selbst ein aufbewahrungspflichtiger Beleg ist, entscheidet die Buchhaltung bzw. der Steuerberater.
Die Lösung setzt das Label auch auf abgelehnte BANF, damit die Entscheidung nachvollziehbar bleibt.

## Datenschutz und Berechtigungen

| Wer | Sieht | Darf |
|---|---|---|
| Mitarbeitende | eigene BANF; Stammdaten; Vertretungen | einreichen, eigene Vertretungen pflegen |
| Freigeber | BANF, die ihnen einmal zur Freigabe vorlagen | genehmigen/ablehnen (Teams, Outlook) |
| BANF Buchhaltung | alle BANF, Exportprotokoll | exportieren |
| BANF Administration | alles | Stammdaten, Konfiguration, Neuzuweisung von Anfragen |
| Dienstkonto (Flow) | alles | einziger Schreibzugriff auf `Bestellanforderungen` |

Antragsteller schreiben nur in die Liste `BanfEingang` (nur eigene Elemente sichtbar). Status, Freigeber und Summen
setzt ausschließlich der Flow, der die Summen außerdem selbst nachrechnet. Eine Manipulation im Browser kann den
Freigabeweg deshalb nicht verändern.

## Laufender Betrieb

- **Neue Kostenstelle / neuer Verantwortlicher**: Liste `BanfKostenstellen` pflegen. Laufende Freigaben behalten
  ihren angefragten Freigeber.
- **Abwesenheit**: Freigeber tragen ihre Vertretung selbst in `BanfVertretungen` ein (Link auf der Portalseite anbieten).
  Gilt ab der nächsten Freigabestufe, die startet.
- **Krankheit ohne Vertretung**: Administration weist die offene Anfrage in der Teams-App „Genehmigungen“ neu zu.
- **Status „Fehler“**: Die Administration erhält eine Mail mit Link auf den Flow-Lauf. Häufige Ursachen: inaktive
  Kostenstelle, kein Rückfall-Freigeber, 30-Tage-Grenze erreicht, Neuzuweisung an den Antragsteller.
- **Monatsexport**: Buchhaltung → Reiter „Export Buchhaltung“ → Zeitraum → „CSV herunterladen“. Jeder Export wird in
  `BanfExportprotokoll` festgehalten.

## Bekannte Grenzen des MVP

- Keine Rücknahme einer eingereichten BANF durch den Antragsteller (Workaround: Freigeber lehnt ab).
- Positionen sind als JSON gespeichert, nicht als eigene Liste; Auswertungen je Position laufen über den CSV-Export.
- Keine Anbindung an proAlpha; die Übernahme erfolgt manuell aus dem Export.
- CSV-Download im Teams-Desktop-Client: je nach Teams-Version öffnet sich der Download im Browser.
- Die Vorschau des Freigabewegs im Formular nutzt die Vertretungen von heute; verbindlich ist der Flow.
