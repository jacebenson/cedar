import { defineConfig } from 'vitest/config'

import { cedarVitestPreset } from '@cedarjs/testing/api'

export default defineConfig({
  plugins: [cedarVitestPreset()],
  test: {
    globals: true,
  },
})
