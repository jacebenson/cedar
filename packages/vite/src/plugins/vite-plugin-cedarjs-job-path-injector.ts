import path from 'node:path'

import type * as ESTree from 'estree'
import oxc from 'oxc-parser'
import type { Plugin } from 'vite'

import { getPaths } from '@cedarjs/project-config'

// Helper function to safely get child nodes from an AST node
function getChildNodes(node: ESTree.Node): unknown[] {
  const children: unknown[] = []

  for (const key in node) {
    // Skip metadata properties that aren't part of the AST structure
    if (
      key === 'parent' ||
      key === 'leadingComments' ||
      key === 'trailingComments' ||
      key === 'range' ||
      key === 'loc' ||
      key === 'type'
    ) {
      continue
    }

    // ESTree.Node types don't have index signatures, but we need to dynamically
    // access properties to traverse the AST. Converting to unknown first, then to
    // Record<string, unknown> is the safest way to access dynamic properties.
    const child = (node as unknown as Record<string, unknown>)[key]
    if (Array.isArray(child)) {
      children.push(...child)
    } else if (child && typeof child === 'object') {
      children.push(child)
    }
  }

  return children
}

export function cedarjsJobPathInjectorPlugin(): Plugin {
  const isExportDeclaration = (
    node: ESTree.Node,
  ): node is ESTree.ExportNamedDeclaration => {
    return node.type === 'ExportNamedDeclaration'
  }

  const isVariableDeclaration = (
    node: ESTree.Declaration | null | undefined,
  ): node is ESTree.VariableDeclaration => {
    return node?.type === 'VariableDeclaration'
  }

  const isCallExpression = (
    node: ESTree.Expression | null | undefined,
  ): node is ESTree.CallExpression => {
    return node?.type === 'CallExpression'
  }

  const isMemberExpression = (
    callee: ESTree.Expression | ESTree.Super,
  ): callee is ESTree.MemberExpression => {
    return callee.type === 'MemberExpression'
  }

  const isIdentifier = (node: ESTree.Node): node is ESTree.Identifier => {
    return node.type === 'Identifier'
  }

  const isObjectExpression = (
    expr: ESTree.Expression | ESTree.SpreadElement | undefined,
  ): expr is ESTree.ObjectExpression => {
    return expr?.type === 'ObjectExpression'
  }

  const isProperty = (
    prop: ESTree.Property | ESTree.SpreadElement,
  ): prop is ESTree.Property => {
    return prop.type === 'Property'
  }

  return {
    name: 'cedarjs-job-path-injector',
    transform(code, id) {
      // Quick check to see if this might be a job file
      if (!code.includes('createJob')) {
        return null
      }

      let ast: ESTree.Program

      try {
        const result = oxc.parseSync(id, code, {
          range: true,
          sourceType: 'module',
        })

        // Check for parsing errors
        if (result.errors && result.errors.length > 0) {
          console.warn('Failed to parse file:', id)
          console.warn('Parsing errors:', result.errors)
          // If we can't parse, just return the original code
          return null
        }

        // OXC parser returns an AST that's compatible with ESTree, but TypeScript
        // doesn't recognize the structural compatibility. This cast is safe because
        // both follow the ESTree specification.
        ast = result.program as ESTree.Program
      } catch (error) {
        console.warn('Failed to parse file:', id)
        console.warn(error)

        // If we can't parse, just return the original code
        return null
      }

      const paths = getPaths()
      let hasModifications = false
      const modifications: {
        start: number
        end: number
        replacement: string
      }[] = []

      // Traverse the AST to find createJob calls
      function traverse(node: ESTree.Node) {
        if (!node || typeof node !== 'object') {
          return
        }

        // Look for export declarations
        if (
          isExportDeclaration(node) &&
          node.declaration &&
          isVariableDeclaration(node.declaration)
        ) {
          const declarator = node.declaration.declarations[0]

          if (declarator) {
            const init = declarator.init

            if (isCallExpression(init) && isMemberExpression(init.callee)) {
              const property = init.callee.property

              if (isIdentifier(property) && property.name === 'createJob') {
                // We found a createJob call, let's inject the path and name
                const variableId = declarator.id

                if (isIdentifier(variableId)) {
                  const importName = variableId.name
                  const importPath = path.relative(paths.api.jobs, id)
                  const importPathWithoutExtension = importPath.replace(
                    /\.[^/.]+$/,
                    '',
                  )

                  // Get the first argument (should be an object)
                  const firstArg = init.arguments[0]

                  if (isObjectExpression(firstArg)) {
                    // Find the end of the object properties to insert our new properties
                    const objectExpr = firstArg
                    const properties = objectExpr.properties
                    let insertPosition: number

                    if (properties.length > 0) {
                      // Insert after the last property
                      const lastProperty = properties[properties.length - 1]

                      if (isProperty(lastProperty) && lastProperty.range) {
                        insertPosition = lastProperty.range[1]
                      } else if (objectExpr.range) {
                        // Fallback: use the object's end minus 1 (before closing brace)
                        insertPosition = objectExpr.range[1] - 1
                      } else {
                        // No range information, skip this modification
                        return
                      }
                    } else {
                      // Empty object, insert after the opening brace
                      if (objectExpr.range) {
                        insertPosition = objectExpr.range[0] + 1
                      } else {
                        // No range information, skip this modification
                        return
                      }
                    }

                    // Build the properties to insert
                    const pathProperty = `path: ${JSON.stringify(importPathWithoutExtension)}`
                    const nameProperty = `name: ${JSON.stringify(importName)}`

                    let insertText = ''
                    if (properties.length > 0) {
                      insertText = `, ${pathProperty}, ${nameProperty}`
                    } else {
                      insertText = `${pathProperty}, ${nameProperty}`
                    }

                    modifications.push({
                      start: insertPosition,
                      end: insertPosition,
                      replacement: insertText,
                    })

                    hasModifications = true
                  }
                }
              }
            }
          }
        }

        // Recursively traverse child nodes
        const childNodes = getChildNodes(node)
        childNodes.forEach((child) => {
          if (child && typeof child === 'object' && 'type' in child) {
            traverse(child as ESTree.Node)
          }
        })
      }

      traverse(ast)

      if (!hasModifications) {
        return null
      }

      // Apply modifications from end to start to avoid offset issues
      modifications.sort((a, b) => b.start - a.start)

      let modifiedCode = code
      for (const mod of modifications) {
        modifiedCode =
          modifiedCode.slice(0, mod.start) +
          mod.replacement +
          modifiedCode.slice(mod.end)
      }

      return {
        code: modifiedCode,
        map: null,
      }
    },
  }
}
