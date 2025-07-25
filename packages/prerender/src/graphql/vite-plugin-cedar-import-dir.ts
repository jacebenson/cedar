import path from 'node:path'

import * as swc from '@swc/core'
import fg from 'fast-glob'
import type { Plugin } from 'vite'

import { importStatementPath } from '@cedarjs/project-config'

function dummySpan() {
  return { start: 0, end: 0, ctxt: 0 }
}

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

      let changed = false
      const newBody: any[] = []

      for (const node of ast.body) {
        if (
          node.type === 'ImportDeclaration' &&
          typeof node.source?.value === 'string' &&
          node.source.value.includes('/**/')
        ) {
          changed = true
          const importName = node.specifiers[0].local.value
          newBody.push({
            type: 'VariableDeclaration',
            kind: 'let',
            span: dummySpan(),
            declarations: [
              {
                type: 'VariableDeclarator',
                span: dummySpan(),
                id: {
                  type: 'Identifier',
                  span: dummySpan(),
                  value: importName,
                },
                init: {
                  type: 'ObjectExpression',
                  span: dummySpan(),
                  properties: [],
                },
              },
            ],
          })

          const importGlob = importStatementPath(node.source.value)
          const cwd = path.dirname(id)
          const dirFiles = fg
            .sync(importGlob, { cwd })
            // Ignore *.test.*, *.scenarios.*, and *.d.ts files.
            .filter(
              (n) =>
                !n.includes('.test.') &&
                !n.includes('.scenarios.') &&
                !n.includes('.d.ts'),
            )

          const staticGlob = importGlob.split('*')[0]
          const filePathToVarName = (filePath: string) => {
            return filePath
              .replace(staticGlob, '')
              .replace(/\.(js|ts)$/, '')
              .replace(/[^a-zA-Z0-9]/g, '_')
          }

          for (const filePath of dirFiles) {
            const { dir: fileDir, name: fileName } = path.parse(filePath)
            const filePathWithoutExtension = fileDir + '/' + fileName
            const filePathVarName = filePathToVarName(filePath)
            const importPath =
              projectIsEsm && !filePathWithoutExtension.endsWith('.js')
                ? `${filePathWithoutExtension}.js`
                : filePathWithoutExtension

            newBody.push({
              type: 'ImportDeclaration',
              span: dummySpan(),
              specifiers: [
                {
                  type: 'ImportNamespaceSpecifier',
                  span: dummySpan(),
                  local: {
                    type: 'Identifier',
                    span: dummySpan(),
                    value: `${importName}_${filePathVarName}`,
                  },
                },
              ],
              source: {
                type: 'StringLiteral',
                span: dummySpan(),
                value: importPath,
              },
            })

            newBody.push({
              type: 'ExpressionStatement',
              span: dummySpan(),
              expression: {
                type: 'AssignmentExpression',
                span: dummySpan(),
                operator: '=',
                left: {
                  type: 'MemberExpression',
                  span: dummySpan(),
                  object: {
                    type: 'Identifier',
                    span: dummySpan(),
                    value: importName,
                  },
                  property: {
                    type: 'Identifier',
                    span: dummySpan(),
                    value: filePathVarName,
                  },
                  computed: false,
                },
                right: {
                  type: 'Identifier',
                  span: dummySpan(),
                  value: `${importName}_${filePathVarName}`,
                },
              },
            })
          }
        } else {
          // Ensure every node in newBody has a span
          if (!node.span) {
            node.span = dummySpan()
          }
          newBody.push(node)
        }
      }

      if (changed) {
        console.log('file was changed')
        const output = await swc.print(
          { ...ast, body: newBody },
          { minify: false },
        )
        console.log('new code', output.code)
        return { code: output.code, map: null }
      }

      return null
    },
  }
}
