module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting, missing semi colons, etc
        'refactor', // Code change that neither fixes a bug nor adds a feature
        'perf',     // Performance improvement
        'test',     // Adding tests
        'chore',    // Maintenance tasks
        'revert',   // Revert changes
        'ci',       // CI/CD related changes
        'build'     // Build system or external dependencies
      ]
    ],
    'type-case': [2, 'always', ['lowerCase']],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', ['lowerCase']],
    'subject-case': [2, 'always', ['sentence-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 200]
  }
}; 