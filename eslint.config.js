import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    ignores: ['dist/**', '*.config.js']
  },
  {
    rules: {
      'no-unused-vars': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off'
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser
    }
  }
]
