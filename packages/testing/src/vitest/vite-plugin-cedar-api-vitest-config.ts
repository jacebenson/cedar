import path from 'node:path'

import type { Plugin } from 'vite'

import { getPaths } from '@cedarjs/project-config'
import { getEnvVarDefinitions } from '@cedarjs/vite'

export function cedarApiVitestConfigPlugin(): Plugin {
  return {
    name: 'cedar-vitest-plugin',
    config: (userConfig) => {
      userConfig.define = {
        ...getEnvVarDefinitions(),
        ...userConfig.define,
      }

      let userNoExternal = userConfig.ssr?.noExternal ?? []
      if (!Array.isArray(userNoExternal)) {
        userNoExternal = []
      }

      // This is best-effort. If the user has noExternal configured with
      // something that's not an array this might not behave as they expect.
      // But this has to be good enough for now.
      userConfig.ssr = {
        ...userConfig.ssr,
        noExternal: ['@cedarjs/testing', ...userNoExternal],
      }

      // TODO: Merge with userConfig.resolve.alias
      userConfig.resolve = {
        alias: {
          src: getPaths().api.src,
        },
      }

      userConfig.test = {
        environment: path.join(import.meta.dirname, 'CedarApiVitestEnv.js'),
        // fileParallelism: false,
        // fileParallelism doesn't work with vitest projects (which is what we're
        // using in the root vitest.config.ts). As a workaround we set poolOptions
        // instead, which also shouldn't work, but was suggested by Vitest team
        // member AriPerkkio (Hiroshi's answer didn't work).
        // https://github.com/vitest-dev/vitest/discussions/7416
        poolOptions: { forks: { singleFork: true } },
        ...userConfig.test,
      }
    },
  }
}
