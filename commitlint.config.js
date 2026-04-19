module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 50],
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 72],
  },
};
