import parser from '@typescript-eslint/parser';

export default [
  { ignores: ['dist/**', 'dev-dist/**', 'android/**'] },
  {
    files: ['**/*.{js,mjs,ts,tsx}'],
    languageOptions: { parser },
    rules: {
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
    },
  },
];
