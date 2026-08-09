// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { copyFile } from 'node:fs/promises';

const sitemapAlias = {
  name: 'sitemap-alias',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      await copyFile(new URL('sitemap-index.xml', dir), new URL('sitemap.xml', dir));
    },
  },
};

export default defineConfig({
  site: 'https://mouzi.cc',
  trailingSlash: 'never',
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
    sitemapAlias,
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    format: 'file',
  },
});
