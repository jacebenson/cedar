import autoImport from 'unplugin-auto-import/vite'

export function autoImportPlugin() {
  return [
    autoImport({
      // targets to transform
      include: [
        /web\/src\/.*\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      ],

      // global imports to register
      imports: [
        {
          '@cedarjs/testing/web': [
            'mockGraphQLQuery',
            'mockGraphQLMutation',
            'mockCurrentUser',
          ],
        },
      ],

      // We provide our mocking types elsewhere and so don't need this plugin to
      // generate them.
      dts: false,
    }),

    autoImport({
      // targets to transform
      include: [
        /api\/src\/.*\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
      ],

      // global imports to register
      imports: [
        // import { mockContext, mockHttpEvent, mockSignedWebhook } from '@cedarjs/testing/api';
        {
          '@cedarjs/testing/api': [
            'mockContext',
            'mockHttpEvent',
            'mockSignedWebhook',
          ],
        },
        // import gql from 'graphql-tag'
        {
          'graphql-tag': ['gql'],
        },
        // import { context } from '@cedarjs/context'
        {
          '@cedarjs/context': ['context'],
        },
      ],

      // We provide our mocking types elsewhere and so don't need this plugin to
      // generate them.
      // TODO: Maybe we should have it at least generate the types for the gql
      // import? (Or do we already provide that some other way?)
      dts: false,
    }),
  ]
}
