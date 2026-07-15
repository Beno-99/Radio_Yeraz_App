const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NOTIFICATION_COLOR = "#D71920";
const NOTIFICATION_ICON_RESOURCE = "@drawable/ic_notification";
const NOTIFICATION_COLOR_RESOURCE = "@color/notification_color";
const NOTIFICATION_LOGO_SOURCE = path.join(
  __dirname,
  "..",
  "assets",
  "images",
  "icon.png",
);

const META_ICON = "com.google.firebase.messaging.default_notification_icon";
const META_COLOR = "com.google.firebase.messaging.default_notification_color";

function ensureMetaData(application, name, resource, replaceResource = false) {
  const metaData = application["meta-data"] ?? [];
  const existing = metaData.find((item) => item?.$?.["android:name"] === name);

  if (existing) {
    existing.$["android:resource"] = resource;
    delete existing.$["android:value"];
    if (replaceResource) {
      existing.$["tools:replace"] = "android:resource";
    } else {
      delete existing.$["tools:replace"];
    }
  } else {
    const item = {
      $: {
        "android:name": name,
        "android:resource": resource,
      },
    };

    if (replaceResource) {
      item.$["tools:replace"] = "android:resource";
    }

    metaData.push(item);
  }

  application["meta-data"] = metaData;
}

function upsertNotificationColor(colorsXml) {
  const colorTag = `<color name="notification_color">${NOTIFICATION_COLOR}</color>`;

  if (colorsXml.includes('name="notification_color"')) {
    return colorsXml.replace(/<color\s+name="notification_color">[^<]*<\/color>/, colorTag);
  }

  if (colorsXml.includes("</resources>")) {
    return colorsXml.replace("</resources>", `  ${colorTag}\n</resources>`);
  }

  return `<resources>\n  ${colorTag}\n</resources>\n`;
}

module.exports = function withNotificationIcon(config) {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    ensureMetaData(mainApplication, META_ICON, NOTIFICATION_ICON_RESOURCE);
    ensureMetaData(mainApplication, META_COLOR, NOTIFICATION_COLOR_RESOURCE, true);

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const resDir = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "res");
      const drawableDir = path.join(resDir, "drawable");
      const drawableNoDpiDir = path.join(resDir, "drawable-nodpi");
      const valuesDir = path.join(resDir, "values");
      const oldIconPath = path.join(drawableDir, "ic_notification.xml");
      const iconPath = path.join(drawableNoDpiDir, "ic_notification.png");
      const colorsPath = path.join(valuesDir, "colors.xml");

      await fs.promises.mkdir(drawableDir, { recursive: true });
      await fs.promises.mkdir(drawableNoDpiDir, { recursive: true });
      await fs.promises.mkdir(valuesDir, { recursive: true });
      await fs.promises.rm(oldIconPath, { force: true });
      await fs.promises.copyFile(NOTIFICATION_LOGO_SOURCE, iconPath);

      let colorsXml = "<resources>\n</resources>\n";
      try {
        colorsXml = await fs.promises.readFile(colorsPath, "utf8");
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }

      await fs.promises.writeFile(colorsPath, upsertNotificationColor(colorsXml));

      return config;
    },
  ]);

  return config;
};
