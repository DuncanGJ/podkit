import type { StarlightConfig } from '@astrojs/starlight/types';

export const sidebar: StarlightConfig['sidebar'] = [
  {
    label: 'Getting Started',
    autogenerate: { directory: 'getting-started' },
  },
  {
    label: 'The Project',
    autogenerate: { directory: 'project' },
  },
  {
    label: 'User Guide',
    items: [
      { slug: 'user-guide/configuration' },
      {
        label: 'Collections',
        autogenerate: { directory: 'user-guide/collections' },
      },
      {
        label: 'Syncing',
        autogenerate: { directory: 'user-guide/syncing' },
      },
      {
        label: 'Devices',
        autogenerate: { directory: 'user-guide/devices' },
      },
      {
        label: 'Transcoding',
        autogenerate: { directory: 'user-guide/transcoding' },
      },
    ],
  },
  {
    label: 'Device Compatibility',
    autogenerate: { directory: 'devices' },
  },
  {
    label: 'Reference',
    autogenerate: { directory: 'reference' },
  },
  {
    label: 'Troubleshooting',
    autogenerate: { directory: 'troubleshooting' },
  },
  {
    label: 'Developer Guide',
    collapsed: true,
    autogenerate: { directory: 'developers' },
  },
];
