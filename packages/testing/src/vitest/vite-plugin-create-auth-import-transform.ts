import type { PluginOption } from 'vite'

export function createAuthImportTransformPlugin(): PluginOption {
  return {
    name: 'create-auth-import-transform',
    enforce: 'pre',
    transform(code: string, id: string) {
      if (id.includes('web/src/auth')) {
        // Remove any existing import of `createAuth` without affecting anything else.
        // This regex defines 4 capture groups, where the second is `createAuth` and
        // the third is an (optional) comma for subsequent named imports — we want to remove those two.
        // Using a negative lookbehind as recommended by
        // https://codeql.github.com/codeql-query-help/javascript/js-polynomial-redos/
        code = code.replace(
          /(import\s*{(?<!\s)\s*[^}]*)(\bcreateAuth\b)(,?)([^}]*})/,
          '$1$4',
        )
        // Add import to mocked `createAuth` at the top of the file.
        code =
          "import { createAuthentication as createAuth } from '@cedarjs/testing/auth'\n" +
          code
      }
      return code
    },
  }
}
