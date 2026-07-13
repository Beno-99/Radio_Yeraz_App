const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const IMPORT_MARKER =
  "import com.facebook.react.modules.network.OkHttpClientProvider";
const INTERCEPTOR_IMPORT = "import okhttp3.Interceptor";
const CONSTANT_MARKER = 'private const val RADIO_YERAZ_API_HOST = "api.radioyeraz.com"';
const FUNCTION_MARKER = "private fun installRadioYerazNetworkClient()";
const CALL_MARKER = "installRadioYerazNetworkClient()";

const CONSTANTS = `
private const val RADIO_YERAZ_API_HOST = "api.radioyeraz.com"
private const val RADIO_YERAZ_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 16; SM-A356E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"
`;

const INSTALL_FUNCTION = `
  private fun installRadioYerazNetworkClient() {
    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClientProvider.createClientBuilder(applicationContext)
        .addInterceptor(
          Interceptor { chain ->
            val request = chain.request()
            val requestBuilder = request.newBuilder()

            if (request.url.host.equals(RADIO_YERAZ_API_HOST, ignoreCase = true)) {
              requestBuilder
                .header("User-Agent", RADIO_YERAZ_USER_AGENT)
                .header("Accept", "application/json,text/plain,*/*")
                .header("Accept-Language", "en-US,en;q=0.9")
                .header("Cache-Control", "no-cache")
            }

            chain.proceed(requestBuilder.build())
          },
        )
        .build()
    }
  }
`;

function addImport(source, importLine) {
  if (source.includes(importLine)) return source;

  return source.replace(
    "import com.facebook.react.defaults.DefaultReactNativeHost\n",
    `import com.facebook.react.defaults.DefaultReactNativeHost\n${importLine}\n`,
  );
}

function addConstants(source) {
  if (source.includes(CONSTANT_MARKER)) return source;

  return source.replace(
    "import expo.modules.ReactNativeHostWrapper\n",
    `import expo.modules.ReactNativeHostWrapper\n${CONSTANTS}`,
  );
}

function addInstallCall(source) {
  if (source.includes(CALL_MARKER)) return source;

  return source.replace(
    "    loadReactNative(this)\n",
    `    ${CALL_MARKER}\n    loadReactNative(this)\n`,
  );
}

function addInstallFunction(source) {
  if (source.includes(FUNCTION_MARKER)) return source;

  return source.replace(
    "\n  override fun onConfigurationChanged(newConfig: Configuration) {",
    `${INSTALL_FUNCTION}\n  override fun onConfigurationChanged(newConfig: Configuration) {`,
  );
}

function patchMainApplication(source) {
  let next = addImport(source, IMPORT_MARKER);
  next = addImport(next, INTERCEPTOR_IMPORT);
  next = addConstants(next);
  next = addInstallCall(next);
  next = addInstallFunction(next);
  return next;
}

module.exports = function withAndroidApiUserAgent(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const mainApplicationPath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "java",
        "com",
        "radioyeraz",
        "radioyeraz",
        "MainApplication.kt",
      );

      const source = await fs.promises.readFile(mainApplicationPath, "utf8");
      await fs.promises.writeFile(
        mainApplicationPath,
        patchMainApplication(source),
      );

      return config;
    },
  ]);
};
