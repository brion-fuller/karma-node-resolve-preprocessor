const { init, parse } = require("es-module-lexer");

exports.isLocalPath = (filename) =>
  filename.startsWith("./") ||
  filename.startsWith("../") ||
  filename.startsWith("/");

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
  const log = logger.create("preprocessor:module-resolver");

  const resolvePath = (modulePath) => {
    if (!isLocalPath(modulePath)) {
      const absolutePath = require.resolve(modulePath);

      return filePathToUrlPath(
        absolutePath,
        karmaConfig.basePath,
        karmaConfig.urlRoot,
        karmaConfig.upstreamProxy ? karmaConfig.upstreamProxy.path : "/"
      );
    }
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
