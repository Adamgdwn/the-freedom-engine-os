const bundledOfflineEnabled = process.env.MOBILE_BUNDLED_OFFLINE_ENABLED === "true";

module.exports = {
  expo: {
    name: "Freedom Anywhere",
    slug: "freedom-mobile-companion",
    icon: "./assets/app-icon.png",
    android: {
      icon: "./assets/app-icon.png",
      package: "com.freedommobile"
    },
    ios: {
      icon: "./assets/app-icon.png",
      bundleIdentifier: "com.freedommobile"
    },
    plugins: bundledOfflineEnabled
      ? [
          "expo-audio",
          [
            "llama.rn",
            {
              enableEntitlements: false,
              enableOpenCL: true
            }
          ]
        ]
      : ["expo-audio"]
  }
};
