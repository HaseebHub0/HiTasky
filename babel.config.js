module.exports = function (api) {
  api.cache(true);

  // Phase 4.3 — strip all console.* (incl. the [Billing]/[Trial] logs)
  // from PRODUCTION bundles only. Dev keeps them for debugging.
  // Requires:  npm i -D babel-plugin-transform-remove-console
  const plugins = [];
  if (process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production') {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
