import { cedarjsDirectoryNamedImportPlugin } from '@cedarjs/vite'

import { autoImportsPlugin } from './vite-plugin-auto-import.js'
import { cedarVitestApiConfigPlugin } from './vite-plugin-cedar-vitest-api-config.js'
import { trackDbImportsPlugin } from './vite-plugin-track-db-imports.js'

export function cedarVitestPreset() {
  return [
    cedarVitestApiConfigPlugin(),
    autoImportsPlugin(),
    cedarjsDirectoryNamedImportPlugin(),
    trackDbImportsPlugin(),
  ]
}
