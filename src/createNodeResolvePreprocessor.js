const { init, parse } = require("es-module-lexer");
const { join, dirname } = require("path");

exports.isLocalPath = (filename) =>
  filename.startsWith("./") ||
  filename.startsWith("../") ||
  filename.startsWith("/") ||
  filename === "import.meta";

// This is copypasted from karma middleware
exports.filePathToUrlPath = (filePath, basePath, urlRoot, proxyPath) => {
  if (filePath.startsWith(basePath)) {
    return (
      proxyPath + urlRoot.substr(1) + "base" + filePath.substr(basePath.length)
    );
  }
  return proxyPath + urlRoot.substr(1) + "absolute" + filePath;
};

exports.createNodeResolvePreprocessor = (karmaConfig, logger) => {
  let moduleResolve;
  let findUp;
  const log = logger.create("preprocessor:node-resolve");

  const requirePackageJson = (packageName) => {
    try {
      return require(join(packageName, "package.json"));
    } catch {}

    return require(findUp("package.json", { cwd: dirname(require.resolve(packageName)) }));
  }

  const resolveAbsolutePath = (modulePath, parent) => {
      try {
        // First try to resolve using the official node algorithm
        return moduleResolve(modulePath, `file://${parent}`, new Set(["browser", "default"])).pathname;
      } catch (e) {
        log.warn(`resolving ${modulePath} with the official node algorithm failed, ${e.message}. Attempting using unofficial resolve methods...`);
      }

      const moduleMatch = modulePath.match(
        "((?:@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*)(.+)?"
      );
      const packageName = moduleMatch[1];
      const path = moduleMatch[2];

      // Check to make sure we are trying to pull in a module entry point
      if (!path) {
        const { module, browser, type } = requirePackageJson(packageName);

        if (module) {
          return require.resolve(join(packageName, module));
        } else if (browser) {
          return require.resolve(join(packageName, browser));
        } else if (type !== "module") {
          log.warn(
            `${packageName} looks like a commonjs module.  This doesn't run natively in the browser.`
          );
        }
      }

      return require.resolve(modulePath);
  };

  const resolvePath = (modulePath, parent) => {
    if (!exports.isLocalPath(modulePath)) {
      const absolutePath = resolveAbsolutePath(modulePath, parent);

      return exports.filePathToUrlPath(
        absolutePath,
        karmaConfig.basePath,
        karmaConfig.urlRoot,
        karmaConfig.upstreamProxy ? karmaConfig.upstreamProxy.path : "/"
      );
    }
    return modulePath;
  };

  return async (content, file, done) => {
    await init;
    // esm-only modules
    [
      { moduleResolve },
      { findUpSync: findUp },
    ] = await Promise.all([
        import("import-meta-resolve"),
        import("find-up")
      ]);

    log.debug('Processing "%s".', file.originalPath);

    try {
      const [imports] = parse(content);
      let pointer = 0;

      const patchedContent = imports.map(({ s, e }) => {
        const name = content.substring(s, e);
        const resolved = resolvePath(name, file.originalPath).replace(/\\/g, "\\\\");
        const text = content.slice(pointer, s) + resolved;
        pointer = e;
        return text;
      });

      patchedContent.push(content.slice(pointer, content.length));

      done(patchedContent.join(""));
    } catch (e) {
      log.error("%s\n  at %s", e.message, file.originalPath);
      done(e, null);
    }
  };
};
