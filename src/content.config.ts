import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {z} from 'astro/zod';
const blog=defineCollection({
  loader:glob({base:'./src/content/blog',pattern:'**/*.{md,mdx}'}),
  schema:({image})=>z.object({
    title:z.string(),description:z.string(),pubDate:z.coerce.date(),
    updatedDate:z.coerce.date().optional(),
    heroImage:z.optional(image()),heroImageAlt:z.string().optional(),
    category:z.enum(['随笔','建站小记']).default('随笔'),
  }),
});
export const collections={blog};
