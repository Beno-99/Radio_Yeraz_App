const { AndroidConfig, withAndroidManifest } = require("@expo/config-plugins");

const REQUIRED_CONFIG_CHANGES = [
  "keyboard",
  "keyboardHidden",
  "orientation",
  "screenSize",
  "screenLayout",
  "smallestScreenSize",
  "uiMode",
];

function mergeConfigChanges(existing = "") {
  const values = new Set(
    existing
      .split("|")
      .map((value) => value.trim())
      .filter(Boolean),
  );

  REQUIRED_CONFIG_CHANGES.forEach((value) => values.add(value));

  return REQUIRED_CONFIG_CHANGES.concat(
    [...values].filter((value) => !REQUIRED_CONFIG_CHANGES.includes(value)),
  ).join("|");
}

function getMainActivity(application) {
  const activities = application.activity ?? [];
  return activities.find((activity) => {
    const name = activity?.$?.["android:name"];
    return name === ".MainActivity" || name?.endsWith(".MainActivity");
  });
}

module.exports = function withAndroidVideoFullscreen(config) {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults,
    );
    const mainActivity = getMainActivity(mainApplication);

    if (mainActivity?.$) {
      mainActivity.$["android:configChanges"] = mergeConfigChanges(
        mainActivity.$["android:configChanges"],
      );
      mainActivity.$["android:hardwareAccelerated"] = "true";
    }

    return config;
  });
};
