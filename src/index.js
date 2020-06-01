const {
  createNodeResolvePreprocessor,
} = require("./createNodeResolvePreprocessor");

createNodeResolvePreprocessor.$inject = ["logger"];

module.exports = {
  "preprocessor:node-resolve": ["factory", createNodeResolvePreprocessor],
};
