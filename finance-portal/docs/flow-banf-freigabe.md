# Flow „BANF Freigabe“ einrichten

Dieser Flow ist die **verbindliche** Umsetzung der Freigaberegeln. Das Webpart berechnet den Freigabeweg
nur als Vorschau (`src/domain/freigabeweg.ts`). Beide müssen dieselben Regeln abbilden; die Unit-Tests in
`src/domain/test/freigabeweg.test.ts` beschreiben die erwarteten Fälle und eignen sich als Testfälle für den Flow.

> Status: Die Anleitung ist aus den Microsoft-Dokumentationen abgeleitet, aber noch **nicht in einem
> Tenant durchgespielt**. Beim ersten Aufbau bitte die Testfälle am Ende vollständig durchgehen.

## Überblick

```
BanfEingang (Bereit = Ja)
  └─ Try
      ├─ 1  Idempotenz: schon übernommen? -> Eingang löschen, Ende
      ├─ 2  Kostenstelle laden, Positionen parsen, Summen serverseitig rechnen
      ├─ 3  BANF in "Bestellanforderungen" anlegen (Antragsteller = Ersteller des Eingangs)
      ├─ 4  Anhänge kopieren, Berechtigungen setzen, Eingang löschen
      ├─ 5  Freigabeweg-Warteschlange bauen (Kostenstelle + Stufen)
      ├─ 6  Do until: je Stufe Vertretung/Vier-Augen prüfen -> Approval -> Verlauf
      │        (Rückfall-Freigeber wird bei Bedarf an die Warteschlange angehängt)
      └─ 7  Abschluss: Status, Mail, Aufbewahrungslabel
  └─ Catch (bei Fehler/Timeout): Status "Fehler", Mail an Administration
```

## Voraussetzungen

| Was | Wert |
|---|---|
| Dienstkonto | z. B. `svc-banf@…`, lizenziert für Power Automate und Exchange (Postfach für Mails), **Vollzugriff** auf die Website (setzt das Provisioning-Skript) |
| Verbindungen | SharePoint, Approvals, Office 365 Outlook – alle mit dem Dienstkonto |
| Website-Zeitzone | `(UTC+01:00) Amsterdam, Berlin, …` – der Flow rechnet Datumswerte in `W. Europe Standard Time` |
| Aufbewahrungslabel | in Purview angelegt und auf die Website veröffentlicht (siehe [betrieb.md](betrieb.md)) |
| Lizenz | „Send an HTTP request to SharePoint“ und Approvals sind Standard-Connectoren; keine Premium-Lizenz nötig |

Den Flow als **Lösung** (Solution) im Ziel-Environment anlegen, damit er sich exportieren und versionieren lässt.
Website-URL und Listennamen als Umgebungsvariablen anlegen:

| Umgebungsvariable | Beispiel |
|---|---|
| `banf_SiteUrl` | `https://vxi.sharepoint.com/sites/Finanzen` |
| `banf_AdminMail` | `finanzen-it@vxi.de` |

Im Folgenden steht `SITE` für die Umgebungsvariable `banf_SiteUrl`.

### Konvention für HTTP-Aufrufe

Alle Aufrufe „Send an HTTP request to SharePoint“ verwenden diese Header:

```
Accept:        application/json;odata=nometadata
Content-Type:  application/json;odata=nometadata
```

Änderungen an Elementen zusätzlich mit:

```
IF-MATCH:      *
X-HTTP-Method: MERGE
```

Request-Bodies **immer als Objekt aus einer „Compose“-Aktion** übergeben (`@{outputs('…')}`), nie per
Text-Verkettung: Begründung und Kommentare enthalten Anführungszeichen und Zeilenumbrüche, die sonst das
JSON zerstören. Der Aktionstyp „Update item“ wird bewusst nicht verwendet, weil er alle Pflichtfelder
erneut verlangt.

## Trigger

**SharePoint – When an item is created or modified**

- Site: `SITE`, List: `BanfEingang`
- Einstellungen → Trigger-Bedingung:
  ```
  @equals(triggerOutputs()?['body/Bereit'], true)
  ```

Das Webpart legt den Eingang mit `Bereit = Nein` an, lädt die Anhänge hoch und setzt erst dann
`Bereit = Ja`. So startet der Flow nie, bevor alle Anhänge da sind.

## Variablen (vor dem Try-Scope initialisieren)

| Name | Typ | Startwert |
|---|---|---|
| `varAntragsteller` | String | `toLower(triggerOutputs()?['body/Author/Email'])` |
| `varAntragstellerName` | String | `triggerOutputs()?['body/Author/DisplayName']` |
| `varBanfId` | Integer | `0` |
| `varBanfNummer` | String | leer |
| `varNetto19`, `varNetto7`, `varNetto0` | Integer | `0` |
| `varVerlauf` | Array | `[]` |
| `varQueue` | Array | `[]` |
| `varIndex` | Integer | `0` |
| `varBereitsFreigebend` | Array | `[]` |
| `varEskalationOffen` | Boolean | `false` |
| `varRueckfallAngefuegt` | Boolean | `false` |
| `varAbgebrochen` | Boolean | `false` |
| `varEndstatus` | String | leer |

`varAntragsteller` stammt aus „Erstellt von“ des Eingangs. Das Webpart kann diesen Wert nicht fälschen.

## Scope „Try“

### 1 Idempotenz

1. **HTTP GET** `Bereits_uebernommen`
   ```
   _api/web/lists/getbytitle('Bestellanforderungen')/items?$select=Id&$filter=EingangId eq @{triggerOutputs()?['body/ID']}&$top=1
   ```
2. **Condition** `@greater(length(body('Bereits_uebernommen')?['value']), 0)`
   - Ja: **Delete item** (BanfEingang, `triggerOutputs()?['body/ID']`) → **Terminate** (Succeeded)

### 2 Prüfen und rechnen

1. **Get item** `Kostenstelle_laden`: List `BanfKostenstellen`, Id `triggerOutputs()?['body/Kostenstelle/Id']`
2. **Condition** `@equals(body('Kostenstelle_laden')?['Aktiv'], true)`, Nein: Aktion **Terminate (Failed)** mit
   Meldung „Kostenstelle inaktiv“ (landet im Catch)
3. **Parse JSON** `Positionen_parsen`, Content `triggerOutputs()?['body/PositionenJson']`, Schema:
   ```json
   {
     "type": "array", "minItems": 1, "maxItems": 50,
     "items": {
       "type": "object",
       "required": ["bezeichnung", "menge", "einheit", "einzelpreisNettoCent", "mwstSatz"],
       "properties": {
         "bezeichnung": { "type": "string", "minLength": 1 },
         "menge": { "type": "number", "exclusiveMinimum": 0 },
         "einheit": { "type": "string" },
         "einzelpreisNettoCent": { "type": "integer", "minimum": 0 },
         "mwstSatz": { "type": "integer", "enum": [0, 7, 19] }
       }
     }
   }
   ```
   Schemaverletzungen lassen die Aktion fehlschlagen → Catch.
4. **Apply to each** `Je_Position` über `body('Positionen_parsen')` (sequenziell, Standard):
   - **Compose** `Positionswert`:
     ```
     int(formatNumber(mul(float(items('Je_Position')?['menge']), items('Je_Position')?['einzelpreisNettoCent']), '0', 'en-US'))
     ```
   - **Switch** auf `items('Je_Position')?['mwstSatz']`: Fälle `19` / `7` / `0` → **Increment variable**
     `varNetto19` / `varNetto7` / `varNetto0` um `outputs('Positionswert')`
5. **Compose** `Summen`:
   ```json
   {
     "netto": "@add(add(variables('varNetto19'), variables('varNetto7')), variables('varNetto0'))",
     "steuer19": "@int(formatNumber(div(mul(variables('varNetto19'), 19), 100.0), '0', 'en-US'))",
     "steuer7": "@int(formatNumber(div(mul(variables('varNetto7'), 7), 100.0), '0', 'en-US'))"
   }
   ```
   **Compose** `BruttoCent`: `add(outputs('Summen')?['netto'], add(outputs('Summen')?['steuer19'], outputs('Summen')?['steuer7']))`

   Die Rechnung entspricht `berechneSummen()` im Webpart: Steuer je Satz auf die Nettosumme, dann runden.

### 3 BANF anlegen

1. **HTTP POST** `Antragsteller_sicherstellen` auf `_api/web/ensureuser`, Body aus Compose:
   ```json
   { "logonName": "i:0#.f|membership|@{variables('varAntragsteller')}" }
   ```
2. **Compose** `BANF_Daten`:
   ```json
   {
     "Title": "@{triggerOutputs()?['body/Title']}",
     "KostenstelleId": "@triggerOutputs()?['body/Kostenstelle/Id']",
     "KostenstelleNummer": "@{body('Kostenstelle_laden')?['Title']}",
     "Lieferant": "@{triggerOutputs()?['body/Lieferant']}",
     "Begruendung": "@{triggerOutputs()?['body/Begruendung']}",
     "Wunschliefertermin": "@if(empty(triggerOutputs()?['body/Wunschliefertermin']), null, triggerOutputs()?['body/Wunschliefertermin'])",
     "PositionenJson": "@{triggerOutputs()?['body/PositionenJson']}",
     "AntragstellerId": "@body('Antragsteller_sicherstellen')?['Id']",
     "SummeNetto": "@div(outputs('Summen')?['netto'], 100.0)",
     "SummeBrutto": "@div(outputs('BruttoCent'), 100.0)",
     "BanfStatus": "Eingereicht",
     "EingereichtAm": "@{triggerOutputs()?['body/Created']}",
     "EingangId": "@triggerOutputs()?['body/ID']",
     "VerlaufJson": "[]"
   }
   ```
3. **HTTP POST** `BANF_anlegen` auf `_api/web/lists/getbytitle('Bestellanforderungen')/items`, Body `@{outputs('BANF_Daten')}`
4. **Set variable** `varBanfId` = `body('BANF_anlegen')?['Id']`
5. **Set variable** `varBanfNummer` = `concat('BANF-', formatDateTime(utcNow(), 'yyyy'), '-', formatNumber(variables('varBanfId'), '00000'))`
6. **Append to array** `varVerlauf`:
   ```json
   { "stufe": "Antrag", "freigeberEmail": "@{variables('varAntragsteller')}", "freigeberName": "@{variables('varAntragstellerName')}",
     "entscheidung": "Eingereicht", "kommentar": "", "zeitpunkt": "@{utcNow()}" }
   ```
7. **HTTP MERGE** auf `…/items(@{variables('varBanfId')})`, Body: `{ "BanfNummer": "…varBanfNummer…", "VerlaufJson": "@{string(variables('varVerlauf'))}" }`
   (als Compose-Objekt)

### 4 Anhänge, Berechtigungen, Eingang

1. **Get attachments** (BanfEingang, Trigger-ID) → **Apply to each** `Je_Anhang`:
   **Get attachment content** (File Identifier `items('Je_Anhang')?['Id']`) →
   **Add attachment** (Bestellanforderungen, `varBanfId`, Name `items('Je_Anhang')?['DisplayName']`, Inhalt `body('Get_attachment_content')`)
2. **HTTP GET** `Leserolle` auf `_api/web/roledefinitions/getbytype(2)` (2 = Lesen, sprachunabhängig)
3. **HTTP POST** auf
   ```
   _api/web/lists/getbytitle('Bestellanforderungen')/items(@{variables('varBanfId')})/breakroleinheritance(copyRoleAssignments=true,clearSubscopes=true)
   ```
   `copyRoleAssignments=true` übernimmt die Listenrechte (Buchhaltung: Lesen, Administration, Dienstkonto).
4. **HTTP POST** (Antragsteller lesen lassen):
   ```
   _api/web/lists/getbytitle('Bestellanforderungen')/items(@{variables('varBanfId')})/roleassignments/addroleassignment(principalid=@{body('Antragsteller_sicherstellen')?['Id']},roledefid=@{body('Leserolle')?['Id']})
   ```
5. **Delete item** (BanfEingang, Trigger-ID)

### 5 Freigabeweg-Warteschlange

1. **HTTP GET** `Stufen_laden`:
   ```
   _api/web/lists/getbytitle('BanfFreigabestufen')/items?$select=Title,Reihenfolge,AbBetragNetto,KostenstellenId,Freigeber/EMail,Freigeber/Title&$expand=Freigeber&$filter=Aktiv eq 1 and AbBetragNetto le @{div(outputs('Summen')?['netto'], 100.0)}&$orderby=Reihenfolge asc&$top=100
   ```
2. **Filter array** `Stufen_fuer_Kostenstelle` aus `body('Stufen_laden')?['value']`:
   ```
   @or(empty(item()?['KostenstellenId']), contains(item()?['KostenstellenId'], triggerOutputs()?['body/Kostenstelle/Id']))
   ```
3. **Select** `Stufen_als_Schritte` aus `body('Stufen_fuer_Kostenstelle')`:
   | Schlüssel | Wert |
   |---|---|
   | `stufe` | `item()?['Title']` |
   | `email` | `toLower(item()?['Freigeber']?['EMail'])` |
   | `name` | `item()?['Freigeber']?['Title']` |
4. **Compose** `Stufe_Kostenstelle`:
   ```json
   { "stufe": "Kostenstelle @{body('Kostenstelle_laden')?['Title']}",
     "email": "@{toLower(body('Kostenstelle_laden')?['Verantwortlicher/Email'])}",
     "name": "@{body('Kostenstelle_laden')?['Verantwortlicher/DisplayName']}" }
   ```
5. **Set variable** `varQueue` = `union(createArray(outputs('Stufe_Kostenstelle')), body('Stufen_als_Schritte'))`

### 6 Do until `Freigabestufen`

- Bedingung (Ausdruck): `@or(variables('varAbgebrochen'), greaterOrEquals(variables('varIndex'), length(variables('varQueue'))))`
- **Limits ändern**: Count `60`, Timeout `P30D` (Standard ist PT1H und würde lange Freigaben abbrechen)

Im Schleifenkörper:

1. **Compose** `Schritt`: `variables('varQueue')[variables('varIndex')]`
2. **Compose** `Stichtag`: `convertTimeZone(utcNow(), 'UTC', 'W. Europe Standard Time', 'yyyy-MM-dd')`
   Vertretungen werden zu Beginn **jeder** Stufe geprüft, nicht nur beim Einreichen.
3. **HTTP GET** `Vertretungen_laden`:
   ```
   _api/web/lists/getbytitle('BanfVertretungen')/items?$select=VertretungVon,VertretungBis,Author/EMail,Vertreter/EMail,Vertreter/Title&$expand=Author,Vertreter&$filter=VertretungBis ge datetime'@{addDays(utcNow(), -1, 'yyyy-MM-dd')}T00:00:00Z'&$top=500
   ```
4. **Filter array** `Vertretung_aktiv` aus `body('Vertretungen_laden')?['value']`:
   ```
   @and(
     equals(toLower(item()?['Author']?['EMail']), outputs('Schritt')?['email']),
     lessOrEquals(convertTimeZone(item()?['VertretungVon'], 'UTC', 'W. Europe Standard Time', 'yyyy-MM-dd'), outputs('Stichtag')),
     greaterOrEquals(convertTimeZone(item()?['VertretungBis'], 'UTC', 'W. Europe Standard Time', 'yyyy-MM-dd'), outputs('Stichtag')))
   ```
   Eine Vertretung zählt nur, wenn der Freigeber sie **selbst** angelegt hat (`Author`).
5. **Compose** `Vertreter`: `toLower(coalesce(first(body('Vertretung_aktiv'))?['Vertreter']?['EMail'], ''))`
6. **Compose** `VertreterGueltig`: `and(not(empty(outputs('Vertreter'))), not(equals(outputs('Vertreter'), variables('varAntragsteller'))))`
7. **Compose** `Freigeber` (leer = Stufe entfällt wegen Vier-Augen-Prinzip):
   ```
   if(outputs('VertreterGueltig'), outputs('Vertreter'),
      if(equals(outputs('Schritt')?['email'], variables('varAntragsteller')), '', outputs('Schritt')?['email']))
   ```
8. **Compose** `FreigeberName`: `if(outputs('VertreterGueltig'), first(body('Vertretung_aktiv'))?['Vertreter']?['Title'], outputs('Schritt')?['name'])`
9. **Condition** `Stufe_entfaellt`: `@empty(outputs('Freigeber'))`
   - **Ja**: Append `varVerlauf` (Entscheidung `Übersprungen`, Kommentar „Vier-Augen-Prinzip: Antragsteller kann nicht selbst genehmigen.“);
     Set `varEskalationOffen` = `true`
   - **Nein**: **Condition** `Schon_genehmigt`: `@contains(variables('varBereitsFreigebend'), outputs('Freigeber'))`
     - **Ja**: Append `varVerlauf` (Entscheidung `Übersprungen`, Kommentar „Hat bereits in einer früheren Stufe genehmigt.“)
     - **Nein**: Block **Freigabe einholen** (unten)
10. **HTTP MERGE** auf die BANF: `{ "VerlaufJson": "@{string(variables('varVerlauf'))}" }`
11. **Condition** `Rueckfall_noetig`:
    ```
    @and(
      equals(add(variables('varIndex'), 1), length(variables('varQueue'))),
      not(variables('varAbgebrochen')),
      not(variables('varRueckfallAngefuegt')),
      or(variables('varEskalationOffen'), empty(variables('varBereitsFreigebend'))))
    ```
    - **Ja**:
      1. **Get items** `Konfiguration_Rueckfall` (BanfKonfiguration, Filter `Title eq 'RueckfallFreigeber'`, Top 1)
      2. **Compose** `Rueckfall`: `toLower(coalesce(first(body('Konfiguration_Rueckfall')?['value'])?['KonfigPerson']?['Email'], ''))`
      3. **Condition** `@or(empty(outputs('Rueckfall')), equals(outputs('Rueckfall'), variables('varAntragsteller')))`
         - Ja: Set `varEndstatus` = `Fehler`, `varAbgebrochen` = `true`, Append Verlauf (`Fehler`, „Kein Freigeber außer dem Antragsteller verfügbar.“)
         - Nein: **Condition** `@not(contains(variables('varBereitsFreigebend'), outputs('Rueckfall')))` → Ja: Append to `varQueue`:
           `{ "stufe": "Rückfall-Freigabe", "email": "@{outputs('Rueckfall')}", "name": "@{first(body('Konfiguration_Rueckfall')?['value'])?['KonfigPerson']?['DisplayName']}" }`
      4. Set `varRueckfallAngefuegt` = `true`
12. **Increment variable** `varIndex` um 1

#### Block „Freigabe einholen“

1. **HTTP POST** `Freigeber_sicherstellen` auf `_api/web/ensureuser`, Body `{ "logonName": "i:0#.f|membership|@{outputs('Freigeber')}" }`
2. **HTTP POST** Leserecht für den Freigeber (wie in 4.4, `principalid=@{body('Freigeber_sicherstellen')?['Id']}`)
3. **HTTP MERGE** auf die BANF:
   `{ "BanfStatus": "In Freigabe", "AktuelleStufe": "@{outputs('Schritt')?['stufe']}", "AktuellerFreigeberId": "@body('Freigeber_sicherstellen')?['Id']" }`
4. **Approvals – Start and wait for an approval** `Freigabe_anfordern`
   - Approval type: *Approve/Reject – First to respond*
   - Title: `BANF @{variables('varBanfNummer')}: @{triggerOutputs()?['body/Title']} (@{formatNumber(div(outputs('Summen')?['netto'], 100.0), 'N2', 'de-DE')} € netto)`
   - Assigned to: `@{outputs('Freigeber')}`
   - Details (Markdown):
     ```
     **Antragsteller:** @{variables('varAntragstellerName')}
     **Kostenstelle:** @{body('Kostenstelle_laden')?['Title']} – @{body('Kostenstelle_laden')?['Bezeichnung']}
     **Lieferant:** @{triggerOutputs()?['body/Lieferant']}
     **Freigabestufe:** @{outputs('Schritt')?['stufe']}@{if(outputs('VertreterGueltig'), concat(' (Vertretung für ', outputs('Schritt')?['name'], ')'), '')}

     **Begründung:** @{triggerOutputs()?['body/Begruendung']}

     **Summe netto:** @{formatNumber(div(outputs('Summen')?['netto'], 100.0), 'N2', 'de-DE')} €
     **Summe brutto:** @{formatNumber(div(outputs('BruttoCent'), 100.0), 'N2', 'de-DE')} €
     ```
     Optional eine Positionstabelle über eine vorherige **Select**-Aktion auf `body('Positionen_parsen')` + **Join**.
   - Item link: `SITE/Lists/Bestellanforderungen/DispForm.aspx?ID=@{variables('varBanfId')}`, Beschreibung: `BANF öffnen`
5. **Compose** `Antwort`: `first(body('Freigabe_anfordern')?['responses'])`
6. **Compose** `Antwortender`: `toLower(outputs('Antwort')?['responder']?['email'])`
7. **Condition** `Selbstfreigabe`: `@or(equals(outputs('Antwortender'), variables('varAntragsteller')), contains(variables('varBereitsFreigebend'), outputs('Antwortender')))`

   Approvals erlaubt das **Neuzuweisen** einer Anfrage. Würde sie an den Antragsteller oder an jemanden, der schon
   genehmigt hat, weitergereicht, wäre das Vier-Augen-Prinzip verletzt.
   - **Ja**: Append Verlauf (`Fehler`, „Vier-Augen-Prinzip verletzt: Freigabe durch @{outputs('Antwortender')} nach Neuzuweisung.“),
     Set `varEndstatus` = `Fehler`, `varAbgebrochen` = `true`
   - **Nein**:
     1. Append to `varVerlauf`:
        ```json
        { "stufe": "@{outputs('Schritt')?['stufe']}",
          "freigeberEmail": "@{outputs('Antwortender')}",
          "freigeberName": "@{outputs('Antwort')?['responder']?['displayName']}",
          "entscheidung": "@{if(equals(body('Freigabe_anfordern')?['outcome'], 'Approve'), 'Genehmigt', 'Abgelehnt')}",
          "kommentar": "@{coalesce(outputs('Antwort')?['comments'], '')}",
          "zeitpunkt": "@{outputs('Antwort')?['responseDate']}" }
        ```
     2. Append to `varBereitsFreigebend`: `outputs('Antwortender')`; zusätzlich `outputs('Freigeber')`, falls abweichend
     3. Set `varEskalationOffen` = `false`
     4. **Condition** `@equals(body('Freigabe_anfordern')?['outcome'], 'Reject')` → Ja: Set `varEndstatus` = `Abgelehnt`, `varAbgebrochen` = `true`

### 7 Abschluss (nach der Schleife, noch im Try)

1. **Condition** `@not(variables('varAbgebrochen'))` → Ja: Set `varEndstatus` = `Freigegeben`
2. **Compose** `Abschluss_Daten`:
   ```json
   {
     "BanfStatus": "@{variables('varEndstatus')}",
     "AktuelleStufe": "",
     "FreigegebenAm": "@if(equals(variables('varEndstatus'), 'Freigegeben'), utcNow(), null)",
     "VerlaufJson": "@{string(variables('varVerlauf'))}"
   }
   ```
   **HTTP MERGE** auf die BANF mit diesem Body.
3. **Send an email (V2)** an `varAntragsteller`: Betreff `BANF @{variables('varBanfNummer')} – @{variables('varEndstatus')}`,
   bei `Abgelehnt` mit Kommentar der letzten Verlaufszeile; bei `Fehler` zusätzlich an `banf_AdminMail`.
4. **Condition** `@or(equals(variables('varEndstatus'), 'Freigegeben'), equals(variables('varEndstatus'), 'Abgelehnt'))` →
   Ja: **Get items** BanfKonfiguration (`Title eq 'Aufbewahrungslabel'`) und **SharePoint – Apply a retention label on the item**
   (List `Bestellanforderungen`, Id `varBanfId`, Label `first(body(…)?['value'])?['KonfigWert']`).

   **Das Label muss der letzte Schreibzugriff sein**: Ein Label, das das Element als Datensatz kennzeichnet, sperrt es
   gegen weitere Änderungen.

## Scope „Catch“

Ausführen nach: Try **hat Fehler** / **Zeitüberschreitung**.

1. **Condition** `@greater(variables('varBanfId'), 0)` → Ja: HTTP MERGE `{ "BanfStatus": "Fehler" }` (Fehler hier mit
   „Configure run after“ ignorieren)
2. **Send an email (V2)** an `banf_AdminMail` mit Link auf den Lauf:
   ```
   concat('https://make.powerautomate.com/environments/', workflow()?['tags']?['environmentName'], '/flows/', workflow()?['name'], '/runs/', workflow()?['run']?['name'])
   ```
   Bei Fehlern **vor** dem Anlegen der BANF bleibt der Eingang erhalten; die Administration kann ihn nach der Korrektur
   erneut verarbeiten, indem sie „Bereit“ auf Nein und wieder auf Ja setzt.

## Grenzen

- Ein Flow-Lauf und eine Approval-Anfrage dauern höchstens **30 Tage**. Bleibt eine Freigabe länger offen, endet der Lauf
  mit Zeitüberschreitung → Status „Fehler“. Die Administration informiert dann den Antragsteller; die BANF wird über
  „Als Vorlage verwenden“ neu eingereicht.
- Die Do-until-Schleife ist auf 60 Durchläufe begrenzt. Bei mehr als ~50 Freigabestufen das Limit erhöhen (unrealistisch).
- Vertretungen gelten nur, wenn sie der Freigeber selbst eingetragen hat. Für Krankheitsfälle weist die Administration die
  offene Anfrage in der Approvals-App neu zu; die Prüfung in Schritt 7 des Blocks schützt dabei das Vier-Augen-Prinzip.

## Testfälle

Aus `src/domain/test/freigabeweg.test.ts` abgeleitet; jeweils mit Testbenutzern durchspielen.

| # | Situation | Erwartung |
|---|---|---|
| 1 | Netto 4.999,99 € | nur Kostenstellenverantwortlicher |
| 2 | Netto genau 5.000,00 € (Stufe „Bereichsleitung“ ab 5.000) | KST-Verantwortlicher, dann Bereichsleitung |
| 3 | Stufe nur für andere Kostenstelle | Stufe wird nicht angefragt |
| 4 | KST-Verantwortlicher hat Vertretung bis heute eingetragen | Vertreter wird angefragt, Details nennen „Vertretung für …“ |
| 5 | Antragsteller ist KST-Verantwortlicher, keine Vertretung, Netto ≥ 5.000 € | Stufe 1 übersprungen, Bereichsleitung genehmigt |
| 6 | Antragsteller ist KST-Verantwortlicher, nur eine Stufe | Rückfall-Freigeber wird angefragt |
| 7 | Antragsteller ist Geschäftsführung (höchste Stufe) | alle Stufen darunter, dann Rückfall-Freigeber |
| 8 | Vertreter des Freigebers ist der Antragsteller | Freigeber selbst wird angefragt |
| 9 | KST-Verantwortlicher ist zugleich Bereichsleitung | nur eine Anfrage, zweite Stufe „übersprungen“ |
| 10 | Freigeber weist die Anfrage an den Antragsteller neu zu, dieser genehmigt | Status „Fehler“, Mail an Administration |
| 11 | Ablehnung in Stufe 1 | Status „Abgelehnt“, keine weiteren Anfragen, Label gesetzt |
| 12 | Freigegeben | Label gesetzt, Element nicht mehr änderbar, erscheint im Export |
| 13 | Anhang (PDF) beim Einreichen | Anhang an der BANF, Eingang gelöscht |
| 14 | Kollege öffnet DispForm-Link einer fremden BANF | Zugriff verweigert |
