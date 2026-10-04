import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { type IPropertyPaneConfiguration, PropertyPaneTextField } from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';

import * as strings from 'BanfPortalWebPartStrings';
import { BanfService } from '../../services/BanfService';
import BanfPortal from './components/BanfPortal';
import { IBanfPortalProps } from './components/IBanfPortalProps';

export interface IBanfPortalWebPartProps {
  /**
   * Absolute URL der Website mit den BANF-Listen. Leer = aktuelle Website.
   * Nötig, wenn das Webpart als Teams-Tab in einem anderen Team läuft.
   */
  listenWebUrl: string;
}

export default class BanfPortalWebPart extends BaseClientSideWebPart<IBanfPortalWebPartProps> {
  private _service: BanfService | undefined;
  private _serviceUrl: string | undefined;

  public render(): void {
    const url = (this.properties.listenWebUrl || '').trim();
    if (!this._service || this._serviceUrl !== url) {
      this._service = new BanfService(this.context, url || undefined);
      this._serviceUrl = url;
    }

    const element: React.ReactElement<IBanfPortalProps> = React.createElement(BanfPortal, { service: this._service });
    ReactDom.render(element, this.domElement);
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (currentTheme && currentTheme.semanticColors) {
      this.domElement.style.setProperty('--bodyText', currentTheme.semanticColors.bodyText || null);
    }
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected get disableReactivePropertyChanges(): boolean {
    // URL erst beim Übernehmen anwenden, nicht bei jedem Tastendruck neu laden.
    return true;
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: { description: strings.PropertyPaneDescription },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('listenWebUrl', {
                  label: strings.ListenWebUrlFieldLabel,
                  description: strings.ListenWebUrlFieldDescription,
                  onGetErrorMessage: (wert: string) =>
                    !wert || /^https:\/\/[^/]+\.sharepoint\.com\/.+/i.test(wert.trim()) ? '' : strings.ListenWebUrlFieldError
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
