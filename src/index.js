const {
  createNodeResolvePreprocessor,
} = require("./createNodeResolvePreprocessor");

createNodeResolvePreprocessor.$inject = ["config", "logger"];

module.exports = {
  "preprocessor:node-resolve": ["factory", createNodeResolvePreprocessor],
};
