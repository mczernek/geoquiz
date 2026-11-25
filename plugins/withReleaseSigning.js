// Release signing and versionCode for CI builds (decision 019). android/ is generated, so the changes to
// android/app/build.gradle live here. Each value is read from a Gradle property (-PNAME=… or
// ~/.gradle/gradle.properties) or else an environment variable of the same name. Without a store file the release
// build stays debug-signed, as Expo generates it, so local release builds keep working without secrets.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// geoquiz: release signing and versionCode (plugins/withReleaseSigning.js)';

const HELPER = `${MARKER}
def geoquizValue = { String name -> findProperty(name) ?: System.getenv(name) }
def geoquizReleaseStoreFile = geoquizValue('GEOQUIZ_UPLOAD_STORE_FILE')

`;

const RELEASE_SIGNING_CONFIG = `
        if (geoquizReleaseStoreFile) {
            release {
                storeFile file(geoquizReleaseStoreFile)
                storePassword geoquizValue('GEOQUIZ_UPLOAD_STORE_PASSWORD')
                keyAlias geoquizValue('GEOQUIZ_UPLOAD_KEY_ALIAS')
                keyPassword geoquizValue('GEOQUIZ_UPLOAD_KEY_PASSWORD')
            }
        }`;

// Fails the prebuild loudly when Expo's template changes, rather than silently shipping a debug-signed bundle.
function replaceOnce(source, pattern, replacement, what) {
  if (!pattern.test(source)) {
    throw new Error(`withReleaseSigning: ${what} not found in android/app/build.gradle; update the plugin`);
  }
  return source.replace(pattern, replacement);
}

function applyReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle;
  let out = replaceOnce(gradle, /^android \{/m, `${HELPER}android {`, 'the android block');
  out = replaceOnce(
    out,
    /^(\s*)versionCode (\d+)$/m,
    (_, indent, code) => `${indent}versionCode((geoquizValue('GEOQUIZ_VERSION_CODE') ?: '${code}').toInteger())`,
    'versionCode',
  );
  out = replaceOnce(
    out,
    /(signingConfigs \{\n\s*debug \{[^}]*\})/,
    `$1${RELEASE_SIGNING_CONFIG}`,
    'the debug signing config',
  );
  out = replaceOnce(
    out,
    /(\brelease \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
    '$1signingConfig geoquizReleaseStoreFile ? signingConfigs.release : signingConfigs.debug',
    'the release build type signing',
  );
  return out;
}

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: expected a Groovy android/app/build.gradle');
    }
    mod.modResults.contents = applyReleaseSigning(mod.modResults.contents);
    return mod;
  });
};
