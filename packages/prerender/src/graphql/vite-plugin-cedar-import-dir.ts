import path from 'node:path'

import * as swc from '@swc/core'
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
export function cedarImportDirPlugin(
  options: { projectIsEsm?: boolean } = {},
): Plugin {
  const { projectIsEsm = false } = options

  return {
    name: 'vite-plugin-cedar-import-dir',
    async transform(code, id) {
      // Check if the code contains import statements with glob patterns
      if (!code.includes('/**/')) {
        return null
      }

      const ext = path.extname(id)
      const ast = await swc.parse(code, {
        syntax: ext === '.ts' || ext === '.tsx' ? 'typescript' : 'ecmascript',
        tsx: ext === '.tsx',
      })

      let hasTransformations = false
      const newBody: swc.ModuleItem[] = []

      for (const item of ast.body) {
        if (
          item.type === 'ImportDeclaration' &&
          item.source.value.includes('/**/')
        ) {
          hasTransformations = true

          // Get the import name from the default import specifier
          const defaultSpecifier = item.specifiers.find(
            (spec): spec is swc.ImportDefaultSpecifier =>
              spec.type === 'ImportDefaultSpecifier',
          )

          if (!defaultSpecifier) {
            // If no default specifier, keep original import
            newBody.push(item)
            continue
          }

          const importName = defaultSpecifier.local.value
          const importPath = item.source.value

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

            // Create variable declaration by parsing: let importName = {}
            const variableDeclarationCode = `let ${importName} = {}`
            const variableDeclarationAst = await swc.parse(
              variableDeclarationCode,
              {
                syntax: 'ecmascript',
              },
            )
            newBody.push(variableDeclarationAst.body[0])

            // Process each matched file
            for (const filePath of dirFiles) {
              const { dir: fileDir, name: fileName } = path.parse(filePath)
              const filePathWithoutExtension = fileDir + '/' + fileName
              const fpVarName = filePathToVarName(filePath)
              const namespaceImportName = `${importName}_${fpVarName}`

              // Create namespace import by parsing
              const finalImportPath = projectIsEsm
                ? `${filePathWithoutExtension}.js`
                : filePathWithoutExtension
              const namespaceImportCode = `import * as ${namespaceImportName} from '${finalImportPath}'`
              const namespaceImportAst = await swc.parse(namespaceImportCode, {
                syntax: 'ecmascript',
              })
              newBody.push(namespaceImportAst.body[0])

              // Create assignment by parsing: importName.fpVarName = importName_fpVarName
              const assignmentCode = `${importName}.${fpVarName} = ${namespaceImportName}`
              const assignmentAst = await swc.parse(assignmentCode, {
                syntax: 'ecmascript',
              })
              newBody.push(assignmentAst.body[0])
            }
          } catch (error) {
            // If there's an error with glob matching, keep the original import
            console.warn(`Failed to process glob import: ${importPath}`, error)
            newBody.push(item)
          }
        } else {
          // Keep non-glob imports as-is
          newBody.push(item)
        }
      }

      // Only return transformed code if we actually made changes
      if (hasTransformations) {
        const transformedAst: swc.Module = {
          ...ast,
          body: newBody,
        }

        const output = await swc.print(transformedAst, {
          minify: false,
        })

        return {
          code: output.code,
          map: null, // For simplicity, not generating source maps
        }
      }

      return null
    },
  }
}
