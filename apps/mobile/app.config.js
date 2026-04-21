module.exports = {
  expo: {
    name: "Freedom",
    slug: "freedom-mobile-companion",
    plugins: [
      [
        "llama.rn",
        {
          enableEntitlements: false,
          enableOpenCL: true
        }
      ]
    ]
  }
};
