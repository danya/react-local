# React Local

Babel plugin that helps to **speed up your React application** transforming your imports to local variables.

**It much reduces:**

- **amount of code browser need to parse and compile** (see [benchmarks](#benchmarks) and [explanation](#explanation))
- and therefore **time of all JavaScript execution** ([see theory](#theory))

## Theory

_The text and media is taken from the [Jeremy Wagner's article](https://developers.google.com/web/fundamentals/performance/optimizing-javascript/tree-shaking/) on Web Fundamentals and Addy Osmani's article "[The Cost of JavaScript](https://medium.com/dev-channel/the-cost-of-javascript-84009f51e99e)"._

JavaScript is an expensive resource to process. Unlike images which only incur relatively trivial decode time once downloaded, JavaScript must be parsed, compiled, and then finally executed. **It is the heaviest time costs of JS**. Byte for byte, this makes JavaScript more expensive than other types of resources.

JavaScript is often compressed when sent over the network, meaning that the actual amount of JavaScript is quite a bit more after the browser decompresses it. But as far as resource processing is concerned, compression is irrelevant. 900 KB of decompressed JavaScript is still 900 KB to the parser and compiler, even though it may be ~300 KB when compressed.

<img alt="js-stage" src="https://developers.google.com/web/fundamentals/performance/optimizing-javascript/tree-shaking/images/figure-1.svg" width="650"/>

For example see also time cost difference between JavaScript and image with the same transfer size [here](https://cdn-images-1.medium.com/max/1600/1*PRVzNizF9jQ_QADF5lQHpA.png).

## Improvements

> **TL;DR**
>
> - almost no effect for transfer JavaScript size/time;
> - very good improvements of parse, compile and execution size/time;
> - to benchmark your app running time before and after this plugin use [size-limit](https://github.com/ai/size-limit).

When using React, a lot of extra code is created because React uses `React.createElement` pragma for JSX and it (and other imports) cannot be well mangled ([see below](#explanation) why). It is not good for your app for JS execution time and therefore for speed of your application.

There is almost no size effect of `react-local` for transfer size of JS if you use gzip or brotli because they usually work fairly well for repeated strings.

But using `react-local` you can easily reduce size of JavaScript browser need to parse, compile and execute and therefore reduce time of JS processing. For example, `react-local` reduces ~1 KB for each ~62 calling of `createElement`. You can try to benchmark your app execution time before and after this plugin using [size-limit](https://github.com/ai/size-limit).

### Benchmarks

**Count of repeats to reach 1 KB inside one file** (higher is better)

|   Property    | Without plugin | With plugin |
| :-----------: | :------------: | :---------: |
| createElement |      ~60       |    ~998     |
|   useState    |      ~85       |    ~1003    |
|   useEffect   |      ~78       |    ~1002    |
|   Fragment    |      ~85       |    ~1003    |

\_\* without parentheses, any parameters and semicolons.

### Explanation

Such results are explained by the fact that the difference between these two results is ability of minifiers (e.g. UglifyJS, Terser) to change names of React properties to shorter one.

When you use standard options of Babel minifiers don’t know `.default.createElement` or similar property is constant so it can’t mangle property access. But when using `react-local` you can solve this problem. This works because your imports are assigned to a local variables, and then used multiple times. So minifiers can mangle the variable name.

Just let's see on minified version of codes above created by Webpack production mode:

- with `react-local`

```javascript
const {Fragment: u, createElement: l} = o.a; // React.default
const a = l(u, null, l('h1', null, 'Header'), l('p', null, 'Text'));
```

- without `react-local`

```javascript
const a = o.a.createElement(
  o.a.Fragment,
  null,
  o.a.createElement('h1', null, 'Header'),
  o.a.createElement('p', null, 'Text')
);
```

## Installation

```shell
npm i --save-dev babel-plugin-react-local
yarn add --dev babel-plugin-react-local
```

## Usage

### Remarks

**NB**: `react-local` works only with ES6 Modules because it looks for `import` statement.

> If you use CommonJS you don't need `react-local`. You should just configure plugin for JSX (change `pragma`) and use such syntax for accessing of React properties:
>
> ```javascript
> const {createElement} = require('react');
> ```

**NB**: to get effect of `react-local` do not access properties via default imported React object (`React.*`), use named imports (just `useState`, `useEffect` etc.)

**NB**: there are two ways to get effect of UglifyJS or Terser minification of variable names:

- use code inside non-global scope (inside function for example). Webpack and other bundlers will wrap you code automatically, only if you don't use it you need to take care of wrapping.
- use `toplevel` flag in UglifyJS/Terser.

#### TypeScript

If you use TypeScript you might be used to import React with namespace import declaration (`import * as React from 'react'`). It can produce some problems, in case of react-local only `createElement` and `Fragment` will be extracted to local variables. To solve this problem you can use `esModuleInterop` option in TS compiler configuration and use named imports. To know more read this [article](https://itnext.io/great-import-schism-typescript-confusion-around-imports-explained-d512fc6769c2).

#### Flow

In Flow when importing React as an ES module you may use either style, but importing as a namespace gives you access to React's utility types (e.g. `React.AbstractComponent`, `React.Ref`). In the latter case as well as in the case of TypeScript react-local will extract only `createElement` and `Fragment`. It will bring a good effect, but if you want more just use such syntax:

```javascript
import React, {useState} from 'react';
import type {AbstractComponent} from 'react';
```

### Babel configuration

To use this plugin just put `react-local` to `plugins` field in Babel configuration. **It works out of box!**

Example of Babel configuration:

```javascript
module.exports = {
  presets: ['@babel/react'],
  plugins: ['react-local'],
};
```

## Options

Available plugin options:

- `extract` `('all' | number)` - count of usage imported React property in document to bind it to a local variable, if `all` is passed all imports will be bound to variable (defaults to `all`)
- `declaration` (`'var' | 'let' | 'const'`) - token used for variable declaration (defaults to `const`).

## Other ways

There are also some other ways do something like this plugin do:

- `@babel/preset-react` + `webpack.ProvidePlugin` — see [article](https://medium.com/@jilizart/reduce-the-size-of-final-jsx-code-c39effca906f)
- `jsx-compress-loader` for webpack — see [repository](https://github.com/theKashey/jsx-compress-loader)
