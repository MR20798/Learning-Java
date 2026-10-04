import * as React from 'react';
import { CommandBarButton, MessageBar, MessageBarType, Pivot, PivotItem, Spinner, SpinnerSize, Stack, Text } from '@fluentui/react';

import { IBanf, IBanfEntwurf } from '../../../domain/types';
import { IAktuellerBenutzer, IEingangEintrag, IStammdaten } from '../../../services/BanfService';
import { BanfDetails } from './BanfDetails';
import { BanfFormular } from './BanfFormular';
import { BanfListe } from './BanfListe';
import { ExportAnsicht } from './ExportAnsicht';
import { IBanfPortalProps } from './IBanfPortalProps';
import styles from './BanfPortal.module.scss';

type Reiter = 'neu' | 'meine' | 'freigabe' | 'export';

interface IListen {
  meine: IBanf[];
  zurFreigabe: IBanf[];
  offeneEingaenge: IEingangEintrag[];
}

const BanfPortal: React.FC<IBanfPortalProps> = ({ service }) => {
  const [benutzer, setBenutzer] = React.useState<IAktuellerBenutzer | undefined>();
  const [stammdaten, setStammdaten] = React.useState<IStammdaten | undefined>();
  const [listen, setListen] = React.useState<IListen>({ meine: [], zurFreigabe: [], offeneEingaenge: [] });
  const [reiter, setReiter] = React.useState<Reiter>('neu');
  const [laedt, setLaedt] = React.useState(true);
  const [fehler, setFehler] = React.useState<string | undefined>();
  const [erfolg, setErfolg] = React.useState<string | undefined>();
  const [details, setDetails] = React.useState<IBanf | undefined>();
  const [vorlage, setVorlage] = React.useState<IBanfEntwurf | undefined>();

  const ladeListen = React.useCallback(async (b: IAktuellerBenutzer): Promise<void> => {
    const [meine, zurFreigabe, offeneEingaenge] = await Promise.all([
      service.ladeMeineBanfs(b.id),
      service.ladeBeiMirZurFreigabe(b.id),
      service.ladeOffeneEingaenge()
    ]);
    setListen({ meine, zurFreigabe, offeneEingaenge });
  }, [service]);

  React.useEffect(() => {
    let abgebrochen = false;
    (async () => {
      try {
        const [b, s] = await Promise.all([service.ladeBenutzer(), service.ladeStammdaten()]);
        if (abgebrochen) {
          return;
        }
        setBenutzer(b);
        setStammdaten(s);
        await ladeListen(b);
      } catch (e) {
        if (!abgebrochen) {
          setFehler(`Die Daten konnten nicht geladen werden: ${(e as Error).message}`);
        }
      } finally {
        if (!abgebrochen) {
          setLaedt(false);
        }
      }
    })().catch(() => undefined);
    return () => { abgebrochen = true; };
  }, [service, ladeListen]);

  const aktualisieren = async (): Promise<void> => {
    if (!benutzer) {
      return;
    }
    setFehler(undefined);
    try {
      await ladeListen(benutzer);
    } catch (e) {
      setFehler(`Aktualisieren fehlgeschlagen: ${(e as Error).message}`);
    }
  };

  const einreichen = async (entwurf: IBanfEntwurf, anhaenge: File[]): Promise<void> => {
    await service.reicheEin(entwurf, anhaenge);
    setVorlage(undefined);
    setErfolg(`„${entwurf.titel}“ wurde eingereicht. Die Freigabe startet in wenigen Augenblicken.`);
    setReiter('meine');
    await aktualisieren();
  };

  const alsVorlage = (banf: IBanf): void => {
    const kostenstelle = stammdaten && stammdaten.kostenstellen.filter(k => k.nummer === banf.kostenstelle)[0];
    setVorlage({
      titel: banf.titel,
      kostenstelleId: kostenstelle ? kostenstelle.id : undefined,
      lieferant: banf.lieferant,
      begruendung: banf.begruendung,
      wunschliefertermin: banf.wunschliefertermin,
      positionen: banf.positionen
    });
    setDetails(undefined);
    setErfolg(undefined);
    setReiter('neu');
  };

  if (laedt) {
    return <Spinner size={SpinnerSize.large} label="BANF-Portal wird geladen …" />;
  }
  if (!benutzer || !stammdaten) {
    return <MessageBar messageBarType={MessageBarType.error}>{fehler || 'Unbekannter Fehler beim Laden.'}</MessageBar>;
  }

  const eigeneBanf = details && details.antragsteller.email.toLowerCase() === benutzer.person.email.toLowerCase();

  return (
    <section className={styles.banfPortal}>
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
        <Text variant="xLarge">Bestellanforderungen</Text>
        <CommandBarButton iconProps={{ iconName: 'Refresh' }} text="Aktualisieren" onClick={aktualisieren} />
      </Stack>
      {fehler && <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setFehler(undefined)}>{fehler}</MessageBar>}
      {erfolg && <MessageBar messageBarType={MessageBarType.success} onDismiss={() => setErfolg(undefined)}>{erfolg}</MessageBar>}

      <Pivot selectedKey={reiter} onLinkClick={item => item && setReiter(item.props.itemKey as Reiter)} headersOnly>
        <PivotItem itemKey="neu" headerText="Neue BANF" itemIcon="Add" />
        <PivotItem itemKey="meine" headerText="Meine BANF" itemIcon="List" itemCount={listen.meine.length} />
        <PivotItem itemKey="freigabe" headerText="Bei mir zur Freigabe" itemIcon="CheckboxComposite"
          itemCount={listen.zurFreigabe.length} />
        {benutzer.istBuchhaltung && <PivotItem itemKey="export" headerText="Export Buchhaltung" itemIcon="Download" />}
      </Pivot>

      <div className={styles.inhalt}>
        {reiter === 'neu' && (
          <>
            {vorlage && <MessageBar>Neue BANF auf Basis einer bestehenden. Bitte alle Angaben prüfen.</MessageBar>}
            <BanfFormular stammdaten={stammdaten} benutzer={benutzer} vorlage={vorlage} onEinreichen={einreichen} />
          </>
        )}
        {reiter === 'meine' && (
          <>
            {listen.offeneEingaenge.length > 0 && (
              <MessageBar messageBarType={MessageBarType.info}>
                {listen.offeneEingaenge.length === 1 ? '1 BANF wird' : `${listen.offeneEingaenge.length} BANF werden`} gerade
                verarbeitet: {listen.offeneEingaenge.map(e => e.titel).join(', ')}. Bitte in Kürze aktualisieren.
              </MessageBar>
            )}
            <BanfListe banfs={listen.meine} leerText="Sie haben noch keine BANF eingereicht." zeigeAntragsteller={false}
              onOeffnen={setDetails} />
          </>
        )}
        {reiter === 'freigabe' && (
          <>
            <MessageBar>
              Genehmigen oder ablehnen Sie BANF in der Teams-App „Genehmigungen“ oder direkt in der E-Mail-Benachrichtigung.
            </MessageBar>
            <BanfListe banfs={listen.zurFreigabe} leerText="Aktuell liegt keine BANF bei Ihnen zur Freigabe." zeigeAntragsteller
              onOeffnen={setDetails} />
          </>
        )}
        {reiter === 'export' && benutzer.istBuchhaltung && <ExportAnsicht service={service} onOeffnen={setDetails} />}
      </div>

      <BanfDetails banf={details} onAlsVorlage={eigeneBanf ? alsVorlage : undefined} onSchliessen={() => setDetails(undefined)} />
    </section>
  );
};

export default BanfPortal;
