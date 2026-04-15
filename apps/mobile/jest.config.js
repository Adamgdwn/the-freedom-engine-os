module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@freedom/shared$': '<rootDir>/../../packages/shared/dist/index.js',
  },
};
