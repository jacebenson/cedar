import { defineConfig } from 'vitest/config'

import {
  autoImportsPlugin,
  trackDbImportsPlugin,
  cedarApiVitestConfigPlugin,
} from '@cedarjs/testing/vitest'
import { cedarjsDirectoryNamedImportPlugin } from '@cedarjs/vite'

export default defineConfig({
  plugins: [
    cedarApiVitestConfigPlugin(),
    autoImportsPlugin(),
    cedarjsDirectoryNamedImportPlugin(),
    trackDbImportsPlugin(),
  ],
  test: {
    globals: true,
  },
})
