// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// 上线后的正式地址
	site: 'https://bozery.me',
	integrations: [mdx(), sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/concept') })],
	fonts: [
		{
			provider: fontProviders.local(),
			name: 'Atkinson',
			cssVariable: '--font-atkinson',
			// 中文字体回退，保证中文显示正常
			fallbacks: [
				'PingFang SC',
				'Hiragino Sans GB',
				'Microsoft YaHei',
				'sans-serif',
			],
			options: {
				variants: [
					{
						src: ['./src/assets/fonts/atkinson-regular.woff'],
						weight: 400,
						style: 'normal',
						display: 'swap',
					},
					{
						src: ['./src/assets/fonts/atkinson-bold.woff'],
						weight: 700,
						style: 'normal',
						display: 'swap',
					},
				],
			},
		},
	],
});
