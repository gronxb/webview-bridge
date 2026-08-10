module.exports = {
  preset: 'react-native',
  // pnpm keeps React Native sources under node_modules/.pnpm, so include the
  // real package paths in Babel transformation as well as their symlinks.
  transformIgnorePatterns: [
    'node_modules/.pnpm/(?!(react-native|@react-native\\+[^@]+)@)',
    'node_modules/(?!.pnpm|react-native|@react-native)',
  ],
};
