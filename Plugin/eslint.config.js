import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        },
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        document: 'readonly',
        window: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        localStorage: 'readonly',
        ResizeObserver: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLSelectElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLStyleElement: 'readonly',
        HTMLScriptElement: 'readonly',
        HTMLBodyElement: 'readonly',
        HTMLHtmlElement: 'readonly',
        Node: 'readonly',
        Element: 'readonly',
        Event: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        KeyboardEvent: 'readonly',
        FocusEvent: 'readonly',
        FormEvent: 'readonly',
        ChangeEvent: 'readonly',
        React: 'readonly',
        ReactNode: 'readonly',
        ReactElement: 'readonly',
        ReactComponentElement: 'readonly',
        ReactText: 'readonly',
        ReactChild: 'readonly',
        ReactChildren: 'readonly',
        ReactFragment: 'readonly',
        ReactPortal: 'readonly',
        RefObject: 'readonly',
        MutableRefObject: 'readonly',
        CSSProperties: 'readonly',
        JSX: 'readonly',
        Promise: 'readonly',
        JSON: 'readonly',
        Math: 'readonly',
        Date: 'readonly',
        RegExp: 'readonly',
        Error: 'readonly',
        TypeError: 'readonly',
        ReferenceError: 'readonly',
        SyntaxError: 'readonly',
        EvalError: 'readonly',
        RangeError: 'readonly',
        URIError: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        WeakMap: 'readonly',
        WeakSet: 'readonly',
        Array: 'readonly',
        Object: 'readonly',
        String: 'readonly',
        Number: 'readonly',
        Boolean: 'readonly',
        Function: 'readonly',
        Symbol: 'readonly',
        BigInt: 'readonly',
        Int8Array: 'readonly',
        Uint8Array: 'readonly',
        Uint8ClampedArray: 'readonly',
        Int16Array: 'readonly',
        Uint16Array: 'readonly',
        Int32Array: 'readonly',
        Uint32Array: 'readonly',
        Float32Array: 'readonly',
        Float64Array: 'readonly',
        DataView: 'readonly',
        ArrayBuffer: 'readonly',
        SharedArrayBuffer: 'readonly',
        Atomics: 'readonly',
        WebAssembly: 'readonly',
        sessionStorage: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        SVGCircleElement: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': typescript,
      react: react,
      'react-hooks': reactHooks
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/prop-types': 'off'
    }
  },
  {
    ignores: ['dist/', 'node_modules/', '*.config.js', '*.config.ts']
  }
]
