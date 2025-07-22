import path from 'node:path'

import { defineConfig } from 'vitest/config'

import {
  autoImportsPlugin,
  trackDbImportsPlugin,
} from '@cedarjs/testing/vitest'
import {
  cedarjsDirectoryNamedImportPlugin,
  getEnvVarDefinitions,
} from '@cedarjs/vite'

export default defineConfig({
  plugins: [
    autoImportsPlugin(),
    cedarjsDirectoryNamedImportPlugin(),
    trackDbImportsPlugin(),
  ],
  define: getEnvVarDefinitions(),
  ssr: {
    noExternal: ['@cedarjs/testing'],
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: './src/CedarApiVitestEnv.ts',
    // fileParallelism: false,
    // fileParallelism doesn't work with vitest projects (which is what we're
    // using in the root vitest.config.ts). As a workaround we set poolOptions
    // instead, which also shouldn't work, but was suggested by Vitest team
    // member AriPerkkio (Hiroshi's answer didn't work).
    // https://github.com/vitest-dev/vitest/discussions/7416
    poolOptions: { forks: { singleFork: true } },
    globals: true,
    globalSetup: ['./src/globalSetup.ts'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
