import type { Plugin } from 'vite'

export function trackDbImportsPlugin(): Plugin {
  return {
    name: 'db-import-tracker',
    transform(code, id) {
      if (id.match(/src\/lib\/db\.(js|ts)$/)) {
        // Inserting the code last (instead of at the top) works nicer with
        // sourcemaps
        return code + '\n\n;globalThis.__cedarjs_db_imported__ = true;'
      }

      return code
    },
  }
}
