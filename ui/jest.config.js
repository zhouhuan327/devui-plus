module.exports = {
  displayName: 'ui',
  preset: '../jest.preset.js',
  transform: {
    '^.+\\.[tj]sx?$': 'babel-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+spec.[jt]s?(x)'],
  coverageDirectory: '../coverage/ui',
};
