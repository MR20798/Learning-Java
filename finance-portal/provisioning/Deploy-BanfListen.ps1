<#
.SYNOPSIS
    Legt Listen, Felder, Gruppen und Berechtigungen des BANF-Portals auf einer SharePoint-Website an.

.DESCRIPTION
    Idempotent: Vorhandene Listen und Felder werden übersprungen, Berechtigungen werden neu gesetzt.
    Interne Feldnamen müssen mit src/services/schema.ts und dem Flow übereinstimmen.

    Voraussetzungen:
      - PowerShell 7.4+, Modul PnP.PowerShell (Install-Module PnP.PowerShell -Scope CurrentUser)
      - Eine Entra-App für PnP PowerShell (Register-PnPEntraIDAppForInteractiveLogin), deren Client-ID übergeben wird
      - Ausführender ist Website-Besitzer

.PARAMETER SiteUrl
    Website, auf der die Listen angelegt werden, z. B. https://vxi.sharepoint.com/sites/Finanzen

.PARAMETER ClientId
    Client-ID der Entra-App für PnP PowerShell.

.PARAMETER FlowDienstkonto
    UPN des Dienstkontos, unter dessen Verbindung der Power-Automate-Flow läuft (erhält Vollzugriff).

.PARAMETER RueckfallFreigeber
    UPN der Person, die genehmigt, wenn sonst nur der Antragsteller genehmigen könnte (z. B. kaufm. Leitung).

.PARAMETER MitarbeitendeLogin
    Login-Name der Gruppe aller Antragsteller. Standard: "Jeder außer externen Benutzern".

.EXAMPLE
    ./Deploy-BanfListen.ps1 -SiteUrl https://vxi.sharepoint.com/sites/Finanzen -ClientId <guid> `
        -FlowDienstkonto svc-banf@vxi.de -RueckfallFreigeber kaufm.leitung@vxi.de
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $SiteUrl,
    [Parameter(Mandatory)] [string] $ClientId,
    [Parameter(Mandatory)] [string] $FlowDienstkonto,
    [Parameter(Mandatory)] [string] $RueckfallFreigeber,
    [string] $MitarbeitendeLogin
)

$ErrorActionPreference = 'Stop'

Connect-PnPOnline -Url $SiteUrl -ClientId $ClientId -Interactive

if (-not $MitarbeitendeLogin) {
    $tenantId = Get-PnPTenantId
    $MitarbeitendeLogin = "c:0-.f|rolemanager|spo-grid-all-users/$tenantId"
}

$GruppeBuchhaltung = 'BANF Buchhaltung'
$GruppeAdmin = 'BANF Administration'

#region Hilfsfunktionen

function Sicherstellen-Liste([string] $Titel, [string] $Url, [string] $Beschreibung) {
    $liste = Get-PnPList -Identity $Titel -ErrorAction SilentlyContinue
    if (-not $liste) {
        Write-Host "Lege Liste '$Titel' an"
        $liste = New-PnPList -Title $Titel -Url "Lists/$Url" -Template GenericList -OnQuickLaunch:$false
        Set-PnPList -Identity $Titel -Description $Beschreibung | Out-Null
    }
    return Get-PnPList -Identity $Titel
}

function Sicherstellen-Feld([string] $Liste, [string] $InternerName, [string] $FeldXml) {
    $vorhanden = Get-PnPField -List $Liste -Identity $InternerName -ErrorAction SilentlyContinue
    if ($vorhanden) {
        Write-Host "  Feld $Liste/$InternerName vorhanden"
        return
    }
    Write-Host "  Lege Feld $Liste/$InternerName an"
    Add-PnPFieldFromXml -List $Liste -FieldXml $FeldXml | Out-Null
    $ansicht = Get-PnPView -List $Liste -Includes ViewFields | Where-Object { $_.DefaultView }
    if ($ansicht) {
        $felder = @($ansicht.ViewFields) + $InternerName
        Set-PnPView -List $Liste -Identity $ansicht.Id -Fields $felder | Out-Null
    }
}

function Feld([string] $Typ, [string] $Name, [string] $Anzeige, [string] $Extra = '') {
    $id = [guid]::NewGuid()
    return "<Field Type=`"$Typ`" Name=`"$Name`" StaticName=`"$Name`" DisplayName=`"$Anzeige`" ID=`"{$id}`" $Extra />"
}

function Personenfeld([string] $Name, [string] $Anzeige, [string] $Extra = '') {
    return Feld 'User' $Name $Anzeige "UserSelectionMode=`"PeopleOnly`" UserSelectionScope=`"0`" ShowField=`"ImnName`" $Extra"
}

function Ja-Nein-Feld([string] $Name, [string] $Anzeige, [bool] $Standard) {
    $wert = if ($Standard) { 1 } else { 0 }
    return "<Field Type=`"Boolean`" Name=`"$Name`" StaticName=`"$Name`" DisplayName=`"$Anzeige`" ID=`"{$([guid]::NewGuid())}`"><Default>$wert</Default></Field>"
}

function Datumsfeld([string] $Name, [string] $Anzeige, [string] $Extra = '') {
    return Feld 'DateTime' $Name $Anzeige "Format=`"DateOnly`" $Extra"
}

function Nachschlagefeld([string] $Name, [string] $Anzeige, [guid] $ZielListe, [bool] $Mehrfach, [string] $Extra = '') {
    $typ = if ($Mehrfach) { 'LookupMulti' } else { 'Lookup' }
    $mult = if ($Mehrfach) { 'Mult="TRUE"' } else { '' }
    return Feld $typ $Name $Anzeige "List=`"{$ZielListe}`" ShowField=`"Title`" $mult $Extra"
}

function Setze-Titelanzeige([string] $Liste, [string] $Anzeige) {
    Set-PnPField -List $Liste -Identity 'Title' -Values @{ Title = $Anzeige } | Out-Null
}

function Setze-Elementsicherheit([string] $Liste, [int] $Lesen, [int] $Schreiben) {
    # ReadSecurity: 1 = alle Elemente, 2 = nur eigene; WriteSecurity: 1 = alle, 2 = nur eigene, 4 = keine
    $l = Get-PnPList -Identity $Liste
    $l.ReadSecurity = $Lesen
    $l.WriteSecurity = $Schreiben
    $l.Update()
    Invoke-PnPQuery
}

# Berechtigungsstufen sind je Websitesprache benannt ("Lesen", "Mitwirken", "Vollzugriff"),
# daher über den sprachunabhängigen RoleTypeKind auflösen.
$script:Rollen = @{}
foreach ($art in 'Reader', 'Contributor', 'Administrator') {
    $script:Rollen[$art] = (Get-PnPRoleDefinition | Where-Object { "$($_.RoleTypeKind)" -eq $art } | Select-Object -First 1).Name
    if (-not $script:Rollen[$art]) { throw "Berechtigungsstufe $art nicht gefunden." }
}
$LESEN = $script:Rollen['Reader']
$MITWIRKEN = $script:Rollen['Contributor']
$VOLLZUGRIFF = $script:Rollen['Administrator']

function Sicherstellen-Gruppe([string] $Titel, [string] $Beschreibung) {
    if (-not (Get-PnPGroup -Identity $Titel -ErrorAction SilentlyContinue)) {
        Write-Host "Lege SharePoint-Gruppe '$Titel' an"
        New-PnPGroup -Title $Titel -Description $Beschreibung | Out-Null
    }
}

function Setze-Listenrechte([string] $Liste, [hashtable] $Gruppen, [hashtable] $Benutzer) {
    Write-Host "  Berechtigungen für $Liste"
    Set-PnPList -Identity $Liste -BreakRoleInheritance -CopyRoleAssignments:$false -ClearSubscopes:$false | Out-Null
    # Durch das Brechen ohne Kopie behält nur der Ausführende Vollzugriff; die gewünschten Rollen hinzufügen:
    foreach ($g in $Gruppen.Keys) { Set-PnPListPermission -Identity $Liste -Group $g -AddRole $Gruppen[$g] | Out-Null }
    foreach ($u in $Benutzer.Keys) { Set-PnPListPermission -Identity $Liste -User $u -AddRole $Benutzer[$u] | Out-Null }
}

#endregion

#region Gruppen und Website-Zugriff

Sicherstellen-Gruppe $GruppeBuchhaltung 'Sieht alle Bestellanforderungen und exportiert sie.'
Sicherstellen-Gruppe $GruppeAdmin 'Pflegt Kostenstellen, Freigabestufen und Konfiguration.'

# Alle Mitarbeitenden dürfen die Website (Seite mit dem Webpart) lesen.
Set-PnPWebPermission -User $MitarbeitendeLogin -AddRole $LESEN | Out-Null
# Der Flow arbeitet mit dem Dienstkonto und braucht Vollzugriff (Berechtigungen je Element setzen).
Set-PnPWebPermission -User $FlowDienstkonto -AddRole $VOLLZUGRIFF | Out-Null

#endregion

#region Stammdaten

$kst = Sicherstellen-Liste 'BanfKostenstellen' 'BanfKostenstellen' 'Kostenstellen und ihre Verantwortlichen (Stufe 1 der BANF-Freigabe).'
Setze-Titelanzeige 'BanfKostenstellen' 'Kostenstelle'
Sicherstellen-Feld 'BanfKostenstellen' 'Bezeichnung' (Feld 'Text' 'Bezeichnung' 'Bezeichnung' 'Required="TRUE"')
Sicherstellen-Feld 'BanfKostenstellen' 'Verantwortlicher' (Personenfeld 'Verantwortlicher' 'Verantwortlicher' 'Required="TRUE"')
Sicherstellen-Feld 'BanfKostenstellen' 'Aktiv' (Ja-Nein-Feld 'Aktiv' 'Aktiv' $true)
# Eindeutigkeit setzt einen Index voraus, daher in zwei Schritten.
Set-PnPField -List 'BanfKostenstellen' -Identity 'Title' -Values @{ Indexed = $true } | Out-Null
Set-PnPField -List 'BanfKostenstellen' -Identity 'Title' -Values @{ EnforceUniqueValues = $true } | Out-Null

Sicherstellen-Liste 'BanfFreigabestufen' 'BanfFreigabestufen' 'Zusätzliche Freigabestufen ab einem Netto-Betrag.' | Out-Null
Setze-Titelanzeige 'BanfFreigabestufen' 'Stufe'
Sicherstellen-Feld 'BanfFreigabestufen' 'Reihenfolge' (Feld 'Number' 'Reihenfolge' 'Reihenfolge' 'Required="TRUE" Decimals="0"')
Sicherstellen-Feld 'BanfFreigabestufen' 'AbBetragNetto' (Feld 'Currency' 'AbBetragNetto' 'Ab Betrag netto' 'Required="TRUE" LCID="1031" Min="0"')
Sicherstellen-Feld 'BanfFreigabestufen' 'Freigeber' (Personenfeld 'Freigeber' 'Freigeber' 'Required="TRUE"')
Sicherstellen-Feld 'BanfFreigabestufen' 'Kostenstellen' (Nachschlagefeld 'Kostenstellen' 'Nur für Kostenstellen (leer = alle)' $kst.Id $true)
Sicherstellen-Feld 'BanfFreigabestufen' 'Aktiv' (Ja-Nein-Feld 'Aktiv' 'Aktiv' $true)

Sicherstellen-Liste 'BanfVertretungen' 'BanfVertretungen' 'Abwesenheitsvertretungen. Der Eintrag gilt immer für die Person, die ihn erstellt hat.' | Out-Null
Setze-Titelanzeige 'BanfVertretungen' 'Hinweis'
Set-PnPField -List 'BanfVertretungen' -Identity 'Title' -Values @{ Required = $false } | Out-Null
Sicherstellen-Feld 'BanfVertretungen' 'Vertreter' (Personenfeld 'Vertreter' 'Vertreter' 'Required="TRUE"')
Sicherstellen-Feld 'BanfVertretungen' 'VertretungVon' (Datumsfeld 'VertretungVon' 'Von' 'Required="TRUE"')
Sicherstellen-Feld 'BanfVertretungen' 'VertretungBis' (Datumsfeld 'VertretungBis' 'Bis' 'Required="TRUE" Indexed="TRUE"')
Set-PnPList -Identity 'BanfVertretungen' -EnableVersioning $true | Out-Null
$vertretungen = Get-PnPList -Identity 'BanfVertretungen'
$vertretungen.ValidationFormula = '=[Bis]>=[Von]'
$vertretungen.ValidationMessage = '"Bis" muss am oder nach "Von" liegen.'
$vertretungen.Update(); Invoke-PnPQuery

Sicherstellen-Liste 'BanfKonfiguration' 'BanfKonfiguration' 'Konfigurationswerte des BANF-Workflows.' | Out-Null
Setze-Titelanzeige 'BanfKonfiguration' 'Schlüssel'
Sicherstellen-Feld 'BanfKonfiguration' 'KonfigPerson' (Personenfeld 'KonfigPerson' 'Person')
Sicherstellen-Feld 'BanfKonfiguration' 'KonfigWert' (Feld 'Text' 'KonfigWert' 'Wert')

if (-not (Get-PnPListItem -List 'BanfKonfiguration' -Query "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>RueckfallFreigeber</Value></Eq></Where></Query></View>")) {
    Add-PnPListItem -List 'BanfKonfiguration' -Values @{ Title = 'RueckfallFreigeber'; KonfigPerson = $RueckfallFreigeber } | Out-Null
}
if (-not (Get-PnPListItem -List 'BanfKonfiguration' -Query "<View><Query><Where><Eq><FieldRef Name='Title'/><Value Type='Text'>Aufbewahrungslabel</Value></Eq></Where></Query></View>")) {
    Add-PnPListItem -List 'BanfKonfiguration' -Values @{ Title = 'Aufbewahrungslabel'; KonfigWert = 'Finanzbeleg 10 Jahre' } | Out-Null
}

#endregion

#region Anträge

$antragsfelder = {
    param([string] $Liste)
    Setze-Titelanzeige $Liste 'Titel'
    Sicherstellen-Feld $Liste 'Kostenstelle' (Nachschlagefeld 'Kostenstelle' 'Kostenstelle' $kst.Id $false 'Required="TRUE"')
    Sicherstellen-Feld $Liste 'Lieferant' (Feld 'Text' 'Lieferant' 'Lieferant' 'Required="TRUE"')
    Sicherstellen-Feld $Liste 'Begruendung' (Feld 'Note' 'Begruendung' 'Begründung' 'Required="TRUE" RichText="FALSE" NumLines="4"')
    Sicherstellen-Feld $Liste 'Wunschliefertermin' (Datumsfeld 'Wunschliefertermin' 'Wunschliefertermin')
    Sicherstellen-Feld $Liste 'PositionenJson' (Feld 'Note' 'PositionenJson' 'Positionen (JSON)' 'Required="TRUE" RichText="FALSE"')
}

Sicherstellen-Liste 'BanfEingang' 'BanfEingang' 'Eingang neuer BANF aus dem Webpart. Wird vom Flow verarbeitet und geleert.' | Out-Null
& $antragsfelder 'BanfEingang'
Sicherstellen-Feld 'BanfEingang' 'Bereit' (Ja-Nein-Feld 'Bereit' 'Bereit zur Verarbeitung' $false)
Set-PnPList -Identity 'BanfEingang' -EnableAttachments $true -EnableVersioning $false | Out-Null
Setze-Elementsicherheit 'BanfEingang' 2 2

Sicherstellen-Liste 'Bestellanforderungen' 'Bestellanforderungen' 'Bestellanforderungen. Schreibzugriff nur durch den Flow; Leserechte je Element.' | Out-Null
& $antragsfelder 'Bestellanforderungen'
Sicherstellen-Feld 'Bestellanforderungen' 'BanfNummer' (Feld 'Text' 'BanfNummer' 'BANF-Nr.' 'Indexed="TRUE" EnforceUniqueValues="TRUE"')
Sicherstellen-Feld 'Bestellanforderungen' 'Antragsteller' (Personenfeld 'Antragsteller' 'Antragsteller' 'Required="TRUE" Indexed="TRUE"')
Sicherstellen-Feld 'Bestellanforderungen' 'KostenstelleNummer' (Feld 'Text' 'KostenstelleNummer' 'Kostenstelle (Nr.)')
Sicherstellen-Feld 'Bestellanforderungen' 'SummeNetto' (Feld 'Currency' 'SummeNetto' 'Summe netto' 'LCID="1031"')
Sicherstellen-Feld 'Bestellanforderungen' 'SummeBrutto' (Feld 'Currency' 'SummeBrutto' 'Summe brutto' 'LCID="1031"')
$statusXml = "<Field Type=`"Choice`" Name=`"BanfStatus`" StaticName=`"BanfStatus`" DisplayName=`"Status`" ID=`"{$([guid]::NewGuid())}`" Indexed=`"TRUE`">" +
    '<CHOICES><CHOICE>Eingereicht</CHOICE><CHOICE>In Freigabe</CHOICE><CHOICE>Freigegeben</CHOICE><CHOICE>Abgelehnt</CHOICE><CHOICE>Fehler</CHOICE></CHOICES>' +
    '<Default>Eingereicht</Default></Field>'
Sicherstellen-Feld 'Bestellanforderungen' 'BanfStatus' $statusXml
Sicherstellen-Feld 'Bestellanforderungen' 'AktuelleStufe' (Feld 'Text' 'AktuelleStufe' 'Aktuelle Stufe')
Sicherstellen-Feld 'Bestellanforderungen' 'AktuellerFreigeber' (Personenfeld 'AktuellerFreigeber' 'Liegt bei' 'Indexed="TRUE"')
Sicherstellen-Feld 'Bestellanforderungen' 'EingereichtAm' (Feld 'DateTime' 'EingereichtAm' 'Eingereicht am' 'Format="DateTime"')
Sicherstellen-Feld 'Bestellanforderungen' 'FreigegebenAm' (Feld 'DateTime' 'FreigegebenAm' 'Freigegeben am' 'Format="DateTime" Indexed="TRUE"')
Sicherstellen-Feld 'Bestellanforderungen' 'VerlaufJson' (Feld 'Note' 'VerlaufJson' 'Verlauf (JSON)' 'RichText="FALSE"')
Sicherstellen-Feld 'Bestellanforderungen' 'EingangId' (Feld 'Number' 'EingangId' 'Eingang-ID' 'Decimals="0" Indexed="TRUE"')
Set-PnPList -Identity 'Bestellanforderungen' -EnableAttachments $true -EnableVersioning $true -MajorVersions 500 | Out-Null

Sicherstellen-Liste 'BanfExportprotokoll' 'BanfExportprotokoll' 'Protokoll der CSV-Exporte durch die Buchhaltung.' | Out-Null
Sicherstellen-Feld 'BanfExportprotokoll' 'ZeitraumVon' (Datumsfeld 'ZeitraumVon' 'Zeitraum von')
Sicherstellen-Feld 'BanfExportprotokoll' 'ZeitraumBis' (Datumsfeld 'ZeitraumBis' 'Zeitraum bis')
Sicherstellen-Feld 'BanfExportprotokoll' 'AnzahlBanf' (Feld 'Number' 'AnzahlBanf' 'Anzahl BANF' 'Decimals="0"')
Sicherstellen-Feld 'BanfExportprotokoll' 'BanfNummern' (Feld 'Note' 'BanfNummern' 'BANF-Nummern' 'RichText="FALSE"')
Set-PnPList -Identity 'BanfExportprotokoll' -EnableVersioning $true | Out-Null
Setze-Elementsicherheit 'BanfExportprotokoll' 1 2

#endregion

#region Berechtigungen

$admin = @{ $GruppeAdmin = $VOLLZUGRIFF }
$dienst = @{ $FlowDienstkonto = $VOLLZUGRIFF }

foreach ($stamm in 'BanfKostenstellen', 'BanfFreigabestufen', 'BanfKonfiguration') {
    Setze-Listenrechte $stamm $admin (@{ $MitarbeitendeLogin = $LESEN } + $dienst)
}
Setze-Listenrechte 'BanfVertretungen' $admin (@{ $MitarbeitendeLogin = $MITWIRKEN } + $dienst)
Setze-Elementsicherheit 'BanfVertretungen' 1 2

# Eingang: alle dürfen anlegen, sehen und ändern aber nur eigene Elemente (ReadSecurity/WriteSecurity = 2).
Setze-Listenrechte 'BanfEingang' $admin (@{ $MitarbeitendeLogin = $MITWIRKEN } + $dienst)

# Bestellanforderungen: keine Rechte für alle; Buchhaltung liest alles. Antragsteller und Freigeber
# erhalten Leserechte je Element durch den Flow.
Setze-Listenrechte 'Bestellanforderungen' (@{ $GruppeBuchhaltung = $LESEN } + $admin) $dienst

Setze-Listenrechte 'BanfExportprotokoll' (@{ $GruppeBuchhaltung = $MITWIRKEN } + $admin) $dienst

#endregion

Write-Host ''
Write-Host 'Fertig. Nächste Schritte:' -ForegroundColor Green
Write-Host "  1. Mitglieder in '$GruppeBuchhaltung' und '$GruppeAdmin' eintragen."
Write-Host '  2. Kostenstellen und Freigabestufen pflegen.'
Write-Host '  3. Aufbewahrungslabel in Purview anlegen und veröffentlichen (siehe docs/betrieb.md).'
Write-Host '  4. Flow "BANF Freigabe" nach docs/flow-banf-freigabe.md einrichten.'
