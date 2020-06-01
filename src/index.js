const {
  createNodeResolvePreprocessor,
} = require("./createNodeResolvePreprocessor");

createNodeResolvePreprocessor.$inject = ["logger"];

module.exports = {
  "preprocessor:module-resolver": ["factory", createNodeResolvePreprocessor],
};
