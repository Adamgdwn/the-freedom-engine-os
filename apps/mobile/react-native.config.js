const bundledOfflineEnabled = process.env.MOBILE_BUNDLED_OFFLINE_ENABLED === "true";

module.exports = bundledOfflineEnabled
  ? {}
  : {
      dependencies: {
        "llama.rn": {
          platforms: {
            android: null
          }
        }
      }
    };
