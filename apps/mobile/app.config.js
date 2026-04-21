const bundledOfflineEnabled = process.env.MOBILE_BUNDLED_OFFLINE_ENABLED === "true";

module.exports = {
  expo: {
    name: "Freedom",
    slug: "freedom-mobile-companion",
    plugins: bundledOfflineEnabled
      ? [
          [
            "llama.rn",
            {
              enableEntitlements: false,
              enableOpenCL: true
            }
          ]
        ]
      : []
  }
};
