import { createRequire } from 'node:module'
import { env } from 'node:process'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
// import { analyzer } from 'vite-bundle-analyzer'
import { VitePWA } from 'vite-plugin-pwa'
import { name } from './package.json'
import { cssRawMinifyPlugin, fixNitroInlineDynamicImports, htmlRawMinifyPlugin, markdownPlugin } from './scripts/vite'
import { appConfig } from './src/config/app'

const require = createRequire(import.meta.url)
const isAliyunESA = Boolean(env.AliUid)
const isTencentEdgeOne = env.HOME === '/dev/shm/home' && env.TMPDIR === '/dev/shm/tmp'
const codemirrorPackages = [
  '@codemirror/autocomplete',
  '@codemirror/commands',
  '@codemirror/lang-markdown',
  '@codemirror/language',
  '@codemirror/language-data',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
]

let customPreset: string | undefined
if (isAliyunESA) {
  // 阿里云 ESA
  customPreset = './preset/aliyun-esa/nitro.config.ts'
}
else if (isTencentEdgeOne) {
  // 腾讯云 EdgeOne
  customPreset = './preset/tencent-edgeone/nitro.config.ts'
}

console.info('Using Nitro Preset:', customPreset || 'auto')

const config = defineConfig({
  plugins: [
    fixNitroInlineDynamicImports(),
    // analyzer(),
    cssRawMinifyPlugin(),
    htmlRawMinifyPlugin(),
    markdownPlugin(),
    devtools(),
    ...(
      env.NODE_ENV !== 'test'
        ? [nitro({
            preset: customPreset,
            cloudflare: {
              wrangler: {
                name,
                observability: { enabled: true },
                keep_vars: true,
              },
            },
            vercel: {
              functions: {
                runtime: 'bun1.x',
              },
            },
          })]
        : []),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: isAliyunESA,
        filter: ({ path }) =>
          path === '/'
          || path === '/about'
          || path.startsWith('/docs'),
      },
    }),
    viteReact(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      outDir: isAliyunESA ? 'dist/client' : '.output/public',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: {
        name: appConfig.name,
        short_name: appConfig.name,
        description: appConfig.description,
        lang: 'zh-CN',
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: appConfig.themeColor.dark,
        background_color: appConfig.themeColor.dark,
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/android-chrome-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        file_handlers: [
          {
            action: '/',
            accept: {
              'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
            },
          },
        ],
        launch_handler: {
          client_mode: 'navigate-existing',
        },
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
    // CodeMirror 扩展依赖 instanceof 检查，必须解析到同一份 state/view 模块。
    dedupe: codemirrorPackages,
    alias: {
      'decode-named-character-reference': require.resolve('decode-named-character-reference'),
      'hast-util-from-html-isomorphic': require.resolve('hast-util-from-html-isomorphic'),
    },
  },
  optimizeDeps: {
    include: codemirrorPackages,
  },
  worker: {
    format: 'es',
  },
})

export default config
