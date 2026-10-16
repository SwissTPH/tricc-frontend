import { defineConfig } from 'vitepress'

const repo = 'https://github.com/SwissTPH/tricc-frontend'
// GitHub Pages serves the project site under the repository name.
const base = process.env.DOCS_BASE ?? '/tricc-frontend/'

export default defineConfig({
  title: 'TRICC Authoring',
  description: 'Author TRICC clinical decision-support guidelines in the browser.',
  base,
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: `${base}favicon.png` }],
    ['link', { rel: 'apple-touch-icon', href: `${base}apple-touch-icon.png` }],
  ],
  cleanUrls: true,
  lastUpdated: true,
  // The hosted app is copied under /app/ after the docs build, so links to it are not pages.
  ignoreDeadLinks: [/^\/app\//],
  themeConfig: {
    logo: {
      light: '/swisstph-logo.png',
      dark: '/swisstph-logo-white.png',
      alt: 'Swiss TPH',
    },
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Concepts', link: '/concepts/why' },
      { text: 'Download', link: '/download' },
      { text: 'Developers', link: '/developers' },
      { text: 'Open the app', link: 'https://swisstph.github.io/tricc-frontend/app/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Authoring a guideline', link: '/guide/authoring' },
          { text: 'Saving and sharing', link: '/guide/saving' },
          { text: 'Project format', link: '/guide/project-format' },
          { text: 'Converting with tricc_oo', link: '/guide/tricc-oo' },
        ],
      },
      {
        text: 'Concepts',
        items: [
          { text: 'Why visual authoring', link: '/concepts/why' },
          { text: 'Segments, activities and nodes', link: '/concepts/layers' },
          { text: 'Node reference', link: '/concepts/nodes' },
          { text: 'Good practice', link: '/concepts/practice' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Download', link: '/download' },
          { text: 'Developers', link: '/developers' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: repo }],
    editLink: { pattern: `${repo}/edit/main/docs/:path`, text: 'Edit this page on GitHub' },
    search: { provider: 'local' },
    footer: {
      message:
        '<a href="https://www.swisstph.ch"><img class="footer-logo" src="' +
        base +
        'swisstph-logo.png" alt="Swiss TPH"></a>',
      copyright: 'Apache-2.0 · Swiss Tropical and Public Health Institute',
    },
  },
})
