const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const cacheRoot = path.join(__dirname, ".metro-cache");

config.fileMapCacheDirectory = path.join(cacheRoot, "file-map");
config.maxWorkers = 2;

module.exports = config;
