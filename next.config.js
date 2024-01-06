const withPlugins = require("next-compose-plugins");
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withPlugins(
  [
    [withBundleAnalyzer],
    // your other plugins here
  ],
  {
    webpack: config => {
      // this will override the experiments
      config.experiments = { ...config.experiments, topLevelAwait: true };
      // this will just update topLevelAwait property of config.experiments
      // config.experiments.topLevelAwait = true
      return config;
    },
  },
);
