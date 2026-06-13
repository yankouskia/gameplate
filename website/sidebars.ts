import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quickstart',
        'getting-started/why-gameplate',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/state-and-actions',
        'guides/loop',
        'guides/input',
        'guides/scenes',
        'guides/selectors',
        'guides/random',
        'guides/timers',
        'guides/recording',
        'guides/headless',
        'guides/webgl',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      items: ['examples/pong', 'examples/particles', 'examples/roguelike', 'examples/headless'],
    },
    'api',
    'faq',
  ],
};

export default sidebars;
