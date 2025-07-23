import path from 'node:path'

import { mergeConfig } from 'vite'
import type { Plugin } from 'vite'

import { getPaths } from '@cedarjs/project-config'
import { getEnvVarDefinitions } from '@cedarjs/vite'

export function cedarApiVitestConfigPlugin(): Plugin {
  return {
    name: 'cedar-vitest-plugin',
    config: (userConfig) => {
      const cedarConfig = {
        define: getEnvVarDefinitions(),
        ssr: {
          noExternal: ['@cedarjs/testing'],
        },
        resolve: {
          alias: {
            src: getPaths().api.src,
          },
        },
        test: {
          environment: path.join(import.meta.dirname, 'CedarApiVitestEnv.js'),
          // fileParallelism: false,
          // fileParallelism doesn't work with vitest projects (which is what we're
          // using in the root vitest.config.ts). As a workaround we set poolOptions
          // instead, which also shouldn't work, but was suggested by Vitest team
          // member AriPerkkio (Hiroshi's answer didn't work).
          // https://github.com/vitest-dev/vitest/discussions/7416
          poolOptions: { forks: { singleFork: true } },
          setupFiles: [path.join(import.meta.dirname, 'vitest-api.setup.js')],
        },
      }

      return mergeConfig(cedarConfig, userConfig)
    },
  }
}
