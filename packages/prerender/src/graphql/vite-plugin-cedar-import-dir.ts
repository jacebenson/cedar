import path from 'node:path'

import { parse } from 'acorn'
import { generate } from 'escodegen'
import type * as ESTree from 'estree'
import fg from 'fast-glob'
import type { Plugin } from 'vite'

import { importStatementPath, getPaths } from '@cedarjs/project-config'

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
 * // services.a = import('src/services/a')
 * // services.b = import('src/services/b')
 * // services.nested_c = import('src/services/nested/c')
 * ```
 */
export function cedarImportDirPlugin(): Plugin {
  const createIdentifier = (name: string): ESTree.Identifier => ({
    type: 'Identifier',
    name,
  })

  const createStringLiteral = (value: string): ESTree.Literal => ({
    type: 'Literal',
    value,
    raw: `'${value}'`,
  })

  const createVariableDeclaration = (
    importName: string,
  ): ESTree.VariableDeclaration => ({
    type: 'VariableDeclaration',
    kind: 'let',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: createIdentifier(importName),
        init: {
          type: 'ObjectExpression',
          properties: [],
        },
      },
    ],
  })

  const createImportDeclaration = (
    namespaceImportName: string,
    fileImportPath: string,
  ): ESTree.ImportDeclaration => ({
    type: 'ImportDeclaration',
    specifiers: [
      {
        type: 'ImportNamespaceSpecifier',
        local: createIdentifier(namespaceImportName),
      },
    ],
    source: createStringLiteral(fileImportPath),
    attributes: [],
  })

  const createExpressionStatement = (
    importName: string,
    filePathVarName: string,
    namespaceImportName: string,
  ): ESTree.ExpressionStatement => ({
    type: 'ExpressionStatement',
    expression: {
      type: 'AssignmentExpression',
      operator: '=',
      left: {
        type: 'MemberExpression',
        object: createIdentifier(importName),
        property: createIdentifier(filePathVarName),
        computed: false,
        optional: false,
      },
      right: createIdentifier(namespaceImportName),
    },
  })

  const isImportDeclaration = (
    node: ESTree.Statement | ESTree.ModuleDeclaration,
  ): node is ESTree.ImportDeclaration => {
    return node.type === 'ImportDeclaration'
  }

  const isStringLiteral = (node: ESTree.Node): node is ESTree.Literal => {
    return node.type === 'Literal' && typeof node.value === 'string'
  }

  const hasGlobPattern = (importDecl: ESTree.ImportDeclaration): boolean => {
    return (
      isStringLiteral(importDecl.source) &&
      typeof importDecl.source.value === 'string' &&
      importDecl.source.value.includes('/**/')
    )
  }

  return {
    name: 'vite-plugin-cedar-import-dir',
    enforce: 'pre',
    async transform(code, id) {
      // Check if the code contains import statements with glob patterns
      if (!code.includes('/**/')) {
        return null
      }

      let ast: ESTree.Program

      try {
        const parsed = parse(code, {
          ecmaVersion: 'latest',
          sourceType: 'module',
          locations: false,
        })

        // Acorn produces ESTree-compatible AST nodes, but TypeScript types
        // have minor differences. This assertion is safe because both follow
        // the ESTree specification for AST structure.
        ast = parsed as ESTree.Program
      } catch (error) {
        console.warn(`Failed to parse file: ${id}`, error)
        return null
      }

      let hasTransformations = false
      const newBody: (ESTree.Statement | ESTree.ModuleDeclaration)[] = []

      for (const item of ast.body) {
        if (isImportDeclaration(item) && hasGlobPattern(item)) {
          hasTransformations = true

          // Get the import name from the default import specifier
          const defaultSpecifier = item.specifiers.find(
            (spec): spec is ESTree.ImportDefaultSpecifier =>
              spec.type === 'ImportDefaultSpecifier',
          )

          if (!defaultSpecifier) {
            // If no default specifier, keep original import
            newBody.push(item)
            continue
          }

          const importName = defaultSpecifier.local.name
          const source = item.source

          if (!isStringLiteral(source) || typeof source.value !== 'string') {
            // This shouldn't happen due to hasGlobPattern check, but for type safety
            newBody.push(item)
            continue
          }

          const importPath = source.value

          const importGlob = importStatementPath(importPath)
          const cwd = importGlob.startsWith('src/')
            ? getPaths().api.base
            : path.dirname(id)

          try {
            const dirFiles = fg
              .sync(importGlob, { cwd })
              // Ignore *.test.*, *.scenarios.* and *.d.ts files
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

            // Create variable declaration: let importName = {}
            newBody.push(createVariableDeclaration(importName))

            // Process each matched file
            for (const filePath of dirFiles) {
              const { dir: fileDir, name: fileName } = path.parse(filePath)
              const fileImportPath = fileDir + '/' + fileName
              const filePathVarName = filePathToVarName(filePath)
              const namespaceImportName = `${importName}_${filePathVarName}`

              // Create namespace import: import * as importName_filePathVarName from 'fileImportPath'
              // I'm generating extensionless imports here and let the rest of
              // the plugin pipeline handle the extension.
              newBody.push(
                createImportDeclaration(namespaceImportName, fileImportPath),
              )

              // Create assignment: importName.filePathVarName = importName_filePathVarName
              newBody.push(
                createExpressionStatement(
                  importName,
                  filePathVarName,
                  namespaceImportName,
                ),
              )
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
        const transformedAst: ESTree.Program = {
          type: 'Program',
          sourceType: 'module',
          body: newBody,
        }

        const output = generate(transformedAst, {
          format: {
            indent: {
              style: '  ',
            },
            quotes: 'single',
          },
        })

        return {
          code: output,
          map: null, // For simplicity, not generating source maps
        }
      }

      return null
    },
  }
}
