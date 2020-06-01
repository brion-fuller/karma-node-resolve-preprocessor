# karma-node-resolve-preprocessor

[Karma](http://karma-runner.github.io) preprocessor to host bare module imports using the Node resolution algorithm, for using third party modules in node_modules.

## The problem

Starting version `3.1.0` Karma can natively run ESModule imports using `type=module` flag. Browsers module has a limitation of not being able to handle bare module imports (i.e. `import {LitElement} from 'lit-element';`). This will cause an error requiring a full url or a relative path. One solution is using a npm assist service like [unpkg](https://unpkg.com/) but this has the limitation of online only.

This preprocessor aims to help test esmodules without the need to compile or bundle your code.This tool can be used to rewrite bare module imports to a fully qualified path hosted by karma.

## Installation

```bash
npm install karma-node-resolve-preprocessor --save-dev
```

## Configuration

In order for this preprocessor to work, it is required to include the node_modules in `files` and `preprocessors` field:

```js
// karma.conf.js
module.exports = (config) => {
  config.set({
    files: [
      { type: "module", pattern: "test/**/*.js" },
      { type: "module", pattern: "src/**/*.js", included: false },
      {
        type: "module",
        pattern: "node_modules/@(lit-element|lit-html)/**/*.js",
        included: false,
      },
    ],
    preprocessors: {
      "@(src|test)/**/*.js": ["module-resolver"],
      "node_modules/@(lit-element|lit-html)/**/*.js": ["module-resolver"],
    },
  });
};
```

Example:

```js
// Given
import { LitElement, html } from "lit-element";

// Rewrites to
import {
  LitElement,
  html,
} from "/base/node_modules/lit-element/lit-element.js";
```
