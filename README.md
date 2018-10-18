# React Local

Babel plugin that helps you to improve speed of React JSX with local variables.

- **Calling of `createElement` is about 40% faster** ([see benchmarks](https://jsperf.com/call-to-object-method)).
- Reduce amount of code browser need to parse.
- Reduce bundle size in case when you do not use gzip.

**Input**:

```jsx
import React, { Fragment } from 'react'

const App = props => (
  <>
    <h1>Header</h1>
    <p>Text</p>
  </>
)
```

**Output** (with external preset/plugin for transforming JSX):

- with `react-local` and right configured JSX plugin:

```javascript
import React from 'react'
const { createElement: createElement, Fragment: Fragment } = React

const App = props =>
  createElement(
    Fragment,
    null,
    createElement('h1', null, 'Header'),
    createElement('p', null, 'Text')
  )
```

- without `react-local`:

```javascript
import React from 'react'

const App = props =>
  React.createElement(
    React.Fragment,
    null,
    React.createElement('h1', null, 'Header'),
    React.createElement('p', null, 'Text')
  )
```

### Speed improvements

Using JSX you really often call the same function, but always directly (`o.a.createElement`). Using local variable to access the same object property is **nearly 40% faster** ([see benchmarks](https://jsperf.com/call-to-object-method)).

### Size improvements

Honestly, there is almost **NO size effect if you use gzip**, but if you do not (why?!) it can help your to reduce bundle size (just always `l` instead of always `o.a.createElement`). _Also amount of code browser need to parse is less anyway._

Let's analyze minified version of codes above created by Webpack production mode. (`React.default` showed here as not minified for better understanding, in real bundle it will something like `o.a`). The difference between these two results is ability of UglifyJS to change names of React properties to shorter one.

- with `react-local`:

```javascript
const { Fragment: u, createElement: l } = React.default
const a = l(u, null, l('h1', null, 'Header'), l('p', null, 'Text'))
```

- without `react-local`:

```javascript
const a = React.default.createElement(
  React.default.Fragment,
  null,
  React.default.createElement('h1', null, 'Header'),
  React.default.createElement('p', null, 'Text')
)
```

## Installation

```shell
npm i --save-dev babel-plugin-react-local
yarn add --dev babel-plugin-react-local
```

## Usage

_Note_: there are also some other way do something like this plugin do using Babel and Webpack: [see here](https://medium.com/@jilizart/reduce-the-size-of-final-jsx-code-c39effca906f)

**NB**: `react-local` works only with ES6 Modules because it looks for `import` statement.

> If you use CommonJS you don't need `react-local`. You should just configure plugin for JSX (change `pragma`) and use such syntax for accessing of React properties:
>
> ```javascript
> const { createElement } = require('react')
> ```

**NB**: to get effect of `react-local` do not access properties via default imported React object (`React.*`), use named imports (just `StrictMode`, `Fragment` etc.)

**NB**: there are two ways to get effect of UglifyJS minification of variable names:

- use code inside non-global scope (inside function for example). Webpack and other bundlers will wrap you code automatically, only if you don't use it you need to take care of wrapping.
- use `toplevel` flag in UglifyJS.

To use this plugin you need:

- put `react-local` to `plugins` field in Babel configuration
- change `pragma` and `pragmaFrag` in configuration of `@babel/preset-react` or `@babel/plugin-transform-react-jsx`. It's necessary because `react-local` extracts properties of React as simple local variables. By default names of these variables will be equal to properties names, so if you do not configure `react-local` just change these options to `createElement` and `Fragment`. Otherwise, keep these names synchronized (see [options](#Options)).

Example of Babel configuration:

```javascript
module.exports = {
  presets: [
    [
      '@babel/preset-react',
      {
        pragma: 'createElement',
        pragmaFrag: 'Fragment'
      }
    ]
  ],
  plugins: ['react-local']
}
```

## Options

Available plugin options:

- `pragma` (string) - local variable name for `React.createElement` (default to `createElement`)
- `pragmaFrag` (string) - local variable name for `React.Fragment` (defaults to `Fragment`)
- `alwaysCreateElement` (boolean) - always import `createElement` even if it is not defined in import statement (defaults to `true`).
- `alwaysFragment` (boolean) - always import `Fragment` even if it is not defined in import statement (defaults to `false`).
- `declaration` (`'var' | 'let' | 'const'`) - token used for variable declaration (defaults to `const`).

## License

This code is licensed under the MIT License. See license file to get more information.

Copyright Daniil Poroshin ([@philosaf](https://github.com/philosaf)).
