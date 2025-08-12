import { prefixPluginTranslations } from '@strapi/helper-plugin';

import pluginPkg from '../../package.json';
import pluginId from './pluginId';
import Initializer from './components/Initializer';

const name = pluginPkg.strapi.name;

export default {
  register(app: any) {
    app.addMenuLink({
      to: `/plugins/${pluginId}`,
      icon: 'globe',
      intlLabel: {
        id: `${pluginId}.plugin.name`,
        defaultMessage: 'Geofences',
      },
      Component: async () => {
        const component = await import('./pages/App');
        return component;
      },
      permissions: [
        {
          action: 'plugin::geofences.read',
          subject: null,
        },
      ],
    });

    app.createSettingSection(
      {
        id: pluginId,
        intlLabel: {
          id: `${pluginId}.plugin.name`,
          defaultMessage: 'Geofences',
        },
      },
      [
        {
          intlLabel: {
            id: `${pluginId}.settings.general`,
            defaultMessage: 'General',
          },
          id: 'general',
          to: `/settings/${pluginId}`,
          Component: async () => {
            const component = await import('./pages/Settings');
            return component;
          },
          permissions: [
            {
              action: 'plugin::geofences.settings',
              subject: null,
            },
          ],
        },
      ]
    );

    app.registerPlugin({
      id: pluginId,
      initializer: Initializer,
      isReady: false,
      name,
    });
  },

  bootstrap(app: any) {},

  async registerTrads(app: any) {
    const { locales } = app;

    const importedTrads = await Promise.all(
      (locales as any[]).map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};