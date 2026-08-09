import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Order inside the sidebar section. */
    order: z.number().default(0),
    section: z.enum(['Start here', 'Rules', 'Platforms', 'Reference']).default('Start here'),
    platforms: z.array(z.enum(['windows', 'linux'])).default(['windows', 'linux']),
    updated: z.coerce.date().optional(),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Krystian Welcel'),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    canonical: z.string().url().optional(),
    draft: z.boolean().default(false),
    related: z.array(z.string()).default([]),
  }),
});

const changelog = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/changelog' }),
  schema: z.object({
    version: z.string(),
    date: z.coerce.date(),
    title: z.string(),
  }),
});

export const collections = { docs, blog, changelog };
