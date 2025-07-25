import path from 'path'

import fg from 'fast-glob'
import type { Plugin } from 'vite'

import { importStatementPath } from '@cedarjs/project-config'

/**
 * This Vite plugin will search for import statements that include a glob double
 * star `**` in the source part of the statement. The files that are matched are
 * imported and appended to an object.
 *
 * @example
 * Given a directory "src/services" that contains "a.js", "b.ts" and
 * "nested/c.js" will produce the following results:
 * ```js
 * import services from 'src/services/**\/*.{js,ts}'
 * console.log(services)
 * // services.a = import('src/services/a.js')
 * // services.b = import('src/services/b.ts')
 * // services.nested_c = import('src/services/nested/c.js')
 * ```
 *
 * @param options Configuration options for the plugin
 * @param options.projectIsEsm Whether the project uses ESM format (adds .js extensions)
 */
function cedarImportDirPlugin(
  options: { projectIsEsm?: boolean } = {},
): Plugin {
  const { projectIsEsm = false } = options

  return {
    name: 'vite-plugin-cedar-import-dir',
    transform(code, id) {
      // Check if the code contains import statements with glob patterns
      if (!code.includes('/**/')) {
        return null
      }

      // Parse import statements with glob patterns
      const importRegex =
        /import\s+(\w+)\s+from\s+['"`]([^'"`]*\*\*[^'"`]*)['"`]/g
      let match
      let transformedCode = code

      while ((match = importRegex.exec(code)) !== null) {
        const [fullMatch, importName, importPath] = match

        const importGlob = importStatementPath(importPath)
        const cwd = path.dirname(id)

        try {
          const dirFiles = fg
            .sync(importGlob, { cwd })
            .filter((n) => !n.includes('.test.')) // ignore `*.test.*` files.
            .filter((n) => !n.includes('.scenarios.')) // ignore `*.scenarios.*` files.
            .filter((n) => !n.includes('.d.ts'))

          const staticGlob = importGlob.split('*')[0]
          const filePathToVarName = (filePath: string) => {
            return filePath
              .replace(staticGlob, '')
              .replace(/\.(js|ts)$/, '')
              .replace(/[^a-zA-Z0-9]/g, '_')
          }

          let replacement = `let ${importName} = {}\n`

          for (const filePath of dirFiles) {
            const { dir: fileDir, name: fileName } = path.parse(filePath)
            const filePathWithoutExtension = fileDir + '/' + fileName
            const fpVarName = filePathToVarName(filePath)

            // Generate import statement
            const importStatement = `import * as ${importName}_${fpVarName} from '${
              projectIsEsm
                ? `${filePathWithoutExtension}.js`
                : filePathWithoutExtension
            }'\n`

            // Generate assignment statement
            const assignmentStatement = `${importName}.${fpVarName} = ${importName}_${fpVarName}\n`

            replacement += importStatement + assignmentStatement
          }

          // Replace the original import statement
          transformedCode = transformedCode.replace(
            fullMatch,
            replacement.trim(),
          )
        } catch (error) {
          // If there's an error with glob matching, keep the original import
          console.warn(`Failed to process glob import: ${importPath}`, error)
        }
      }

      // Only return transformed code if we actually made changes
      if (transformedCode !== code) {
        return {
          code: transformedCode,
          map: null, // For simplicity, not generating source maps
        }
      }

      return null
    },
  }
}

// Default export
export default cedarImportDirPlugin

// Named export for better compatibility
export { cedarImportDirPlugin }
