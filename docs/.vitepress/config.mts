import { defineConfig } from 'vitepress'

const repo = 'https://github.com/SwissTPH/tricc-frontend'

export default defineConfig({
  title: 'TRICC Authoring',
  description: 'Author TRICC clinical decision-support guidelines in the browser.',
  // GitHub Pages serves the project site under the repository name.
  base: process.env.DOCS_BASE ?? '/tricc-frontend/',
  cleanUrls: true,
  lastUpdated: true,
  // The hosted app is copied under /app/ after the docs build, so links to it are not pages.
  ignoreDeadLinks: [/^\/app\//],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
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
    footer: { message: 'Apache-2.0 · Swiss Tropical and Public Health Institute' },
  },
})
