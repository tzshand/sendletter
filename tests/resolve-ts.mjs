// Test-only module resolver: the app's source imports "./thing" (the bundler
// resolves the extension); plain Node needs "./thing.ts". Used via register.mjs.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (e) {
    if (e && e.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".") && !/\.[cm]?[jt]s$/.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    throw e;
  }
}
