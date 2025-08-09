import type { Plugin } from 'vite'

export function trackDbImportsPlugin(): Plugin {
  return {
    name: 'db-import-tracker',
    transform(code, id) {
      if (id.match(/src\/lib\/db\.(js|ts)$/)) {
        // Inserting the code last (instead of at the top) works nicer with
        // sourcemaps
        return (
          code +
          '\n\n;' +
          'if (typeof globalThis !== "undefined") {\n' +
          '  globalThis.__cedarjs_db_imported__ = true;\n' +
          '} else {\n' +
          '  throw new Error(\n' +
          '    "vite-plugin-track-db-imports: globalThis is undefined. " +\n' +
          '    "This is an error with CedarJS"\n' +
          '  );\n' +
          '}\n'
        )
      }

      return code
    },
  }
}
