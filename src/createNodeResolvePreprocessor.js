const { init, parse } = require("es-module-lexer");
const { join } = require("path");

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
  const log = logger.create("preprocessor:node-resolve");

  const resolvePath = (modulePath) => {
    if (!exports.isLocalPath(modulePath)) {
      const moduleMatch = modulePath.match(
        "((?:@[a-z0-9-~][a-z0-9-._~]*/)?[a-z0-9-~][a-z0-9-._~]*)(.+)?"
      );
      const packageName = moduleMatch[1];
      const path = moduleMatch[2];
      let absolutePath = require.resolve(modulePath);

      // Check to make sure we are trying to pull in a module entry point
      if (!path) {
        const { module, browser, type } = require(join(
          packageName,
          "package.json"
        ));

        if (module) {
          absolutePath = require.resolve(join(packageName, module));
        } else if (browser) {
          absolutePath = require.resolve(join(packageName, browser));
        } else if (type !== "module") {
          log.warn(
            `${packageName} looks like a commonjs module.  This doesn't run natively in the browser.`
          );
        }
      }

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

    log.debug('Processing "%s".', file.originalPath);

    try {
      const [imports] = parse(content);
      let pointer = 0;

      const patchedContent = imports.map(({ s, e }) => {
        const name = content.substring(s, e);
        const resolved = resolvePath(name).replace(/\\/g, "\\\\");
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
