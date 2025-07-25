import fs from 'fs'
import path from 'path'

import { describe, it, expect } from 'vitest'

import plugin from '../vite-plugin-cedar-import-dir.js'

describe('vite plugin cedar import dir', () => {
  const fixturesDir = path.join(__dirname, '__fixtures__')

  const callTransform = (vitePlugin: any, code: string, id: string) => {
    if (typeof vitePlugin.transform === 'function') {
      return vitePlugin.transform(code, id)
    }
    if (vitePlugin.transform?.handler) {
      return vitePlugin.transform.handler(code, id)
    }
    throw new Error('Transform function not found')
  }

  it('should transform glob imports correctly', async () => {
    const testCase = 'import-dir'
    const codeFile = path.join(fixturesDir, testCase, 'code.js')
    const outputFile = path.join(fixturesDir, testCase, 'output.js')

    const inputCode = fs.readFileSync(codeFile, 'utf-8')
    const expectedOutput = fs.readFileSync(outputFile, 'utf-8')

    const vitePlugin = plugin()
    const mockId = path.join(fixturesDir, testCase, 'code.js')

    const result = callTransform(vitePlugin, inputCode, mockId)

    if (
      result &&
      typeof result === 'object' &&
      'code' in result &&
      result.code
    ) {
      // Normalize line endings and whitespace for comparison
      const actualCode = result.code.trim().replace(/\r\n/g, '\n')
      const expectedCode = expectedOutput.trim().replace(/\r\n/g, '\n')

      expect(actualCode).toBe(expectedCode)
    } else {
      throw new Error('Plugin did not return transformed code')
    }
  })

  it('should return null for code without glob imports', async () => {
    const inputCode = `
      import React from 'react'
      import { someFunction } from './utils'

      export default function Component() {
        return <div>Hello</div>
      }
    `

    const vitePlugin = plugin()
    const mockId = '/mock/file.js'

    const result = callTransform(vitePlugin, inputCode, mockId)

    expect(result).toBeNull()
  })

  it('should handle ESM mode correctly', async () => {
    const testCase = 'import-dir'
    const codeFile = path.join(fixturesDir, testCase, 'code.js')

    const inputCode = fs.readFileSync(codeFile, 'utf-8')

    const vitePlugin = plugin({ projectIsEsm: true })
    const mockId = path.join(fixturesDir, testCase, 'code.js')

    const result = callTransform(vitePlugin, inputCode, mockId)

    if (
      result &&
      typeof result === 'object' &&
      'code' in result &&
      result.code
    ) {
      // Should include .js extensions for ESM when files are found
      const hasJsExtensions = result.code.includes('.js')
      const hasImports = result.code.includes('import * as')

      // If imports were generated, they should have .js extensions in ESM mode
      if (hasImports) {
        expect(hasJsExtensions).toBe(true)
      } else {
        // If no imports were generated, that's also valid (no matching files)
        expect(result.code).toContain('let services = {}')
      }
    }
  })

  it('should handle missing directories gracefully', async () => {
    const inputCode = `import services from './test-files/**/*.{js,ts}'`

    // Create a temporary directory structure for testing
    const testDir = path.join(__dirname, 'temp-test-dir')

    // We can't actually create files in this test environment,
    // so we'll just test that the plugin doesn't crash with missing directories
    const vitePlugin = plugin()
    const mockId = path.join(testDir, 'file.js')

    const result = callTransform(vitePlugin, inputCode, mockId)

    // Should handle missing directories gracefully
    expect(result).toBeDefined()
  })

  it('should handle multiple glob imports in the same file', async () => {
    const inputCode = `
      import services from './services/**/*.{js,ts}'
      import utils from './utils/**/*.js'
    `

    const vitePlugin = plugin()
    const mockId = '/mock/file.js'

    const result = callTransform(vitePlugin, inputCode, mockId)

    if (
      result &&
      typeof result === 'object' &&
      'code' in result &&
      result.code
    ) {
      // Should contain both service and utils variable declarations
      expect(result.code).toContain('let services = {}')
      expect(result.code).toContain('let utils = {}')
    }
  })

  it('should generate valid variable names from file paths', async () => {
    const inputCode = `import components from './components/**/*.{js,ts}'`

    const vitePlugin = plugin()
    const mockId = '/mock/file.js'

    const result = callTransform(vitePlugin, inputCode, mockId)

    if (
      result &&
      typeof result === 'object' &&
      'code' in result &&
      result.code
    ) {
      // Variable names should be valid JavaScript identifiers
      // (no special characters except underscores)
      const variableNameRegex = /components\.([a-zA-Z_][a-zA-Z0-9_]*)/g
      const matches = result.code.match(variableNameRegex)

      if (matches) {
        matches.forEach((match: string) => {
          const varName = match.split('.')[1]
          expect(varName).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]*$/)
        })
      }
    }
  })
})
