import { cedarjsDirectoryNamedImportPlugin } from '@cedarjs/vite'

import { autoImportsPlugin } from './vite-plugin-auto-import.js'
import { cedarApiVitestConfigPlugin } from './vite-plugin-cedar-api-vitest-config.js'
import { trackDbImportsPlugin } from './vite-plugin-track-db-imports.js'

export function cedarApiVitestPreset() {
  return [
    cedarApiVitestConfigPlugin(),
    autoImportsPlugin(),
    cedarjsDirectoryNamedImportPlugin(),
    trackDbImportsPlugin(),
  ]
}
