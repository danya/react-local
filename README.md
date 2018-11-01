# React Local

Babel plugin that helps to optimize React application transforming your imports to local variables.

**It much reduces:**

- amount of code browser need to parse and compile ([see benchmarks](#benchmarks));
- time of all JavaScript execution ([see theory](#theory)).

## Theory

_The text and media is taken from the great [Jeremy Wagner's article](https://developers.google.com/web/fundamentals/performance/optimizing-javascript/tree-shaking/) on Web Fundamentals._

JavaScript is an expensive resource to process. Unlike images which only incur relatively trivial decode time once downloaded, JavaScript must be parsed, compiled, and then finally executed. Byte for byte, this makes JavaScript more expensive than other types of resources.

JavaScript is often compressed when sent over the network, meaning that the actual amount of JavaScript is quite a bit more after the browser decompresses it. But as far as resource processing is concerned, compression is irrelevant. 900 KB of decompressed JavaScript is still 900 KB to the parser and compiler, even though it may be ~300 KB when compressed.

<center>
<img alt="js-stage" src="https://developers.google.com/web/fundamentals/performance/optimizing-javascript/tree-shaking/images/figure-1.svg" width="650"/>
</center>

## Improvements

> **TL;DR**
>
> - almost no effect for transfer JavaScript size/time;
> - very good improvements of parse, compile and execution size/time.

When using React, a lot of extra code is created. See [Dan Abramov's tweets](https://twitter.com/dan_abramov/status/841266032576724992) to find more about it.

There is almost no size effect of `react-local` for transfer size of JS if you use gzip or brotli because they usually work fairly well for repeated strings.

But using `react-local` you can easily reduce size of JavaScript browser need to parse, compile and execute and therefore reduce time of JS processing. For example, `react-local` reduces ~1 KB for each ~62 calling of `createElement`.

### Benchmarks

**Count of repeats to reach 1 KB** (higher is better)

|   Property    | Without plugin | With plugin |
| :-----------: | :------------: | :---------: |
| createElement |      ~60       |    ~998     |
|   useState    |      ~85       |    ~1003    |
|   useEffect   |      ~78       |    ~1002    |
|   Fragment    |      ~85       |    ~1003    |

_\* without parentheses, any parameters and semicolons. You can find more [here](/benchmarks/benchmarks/)._

### Explanation

Just let's analyze minified version of codes above created by Webpack production mode. The difference between these two results is ability of UglifyJS to change names of React properties to shorter one.

- with `react-local`

```javascript
const { Fragment: u, createElement: l } = o.a // React.default
const a = l(u, null, l('h1', null, 'Header'), l('p', null, 'Text'))
```

- without `react-local`

```javascript
const a = o.a.createElement(
  o.a.Fragment,
  null,
  o.a.createElement('h1', null, 'Header'),
  o.a.createElement('p', null, 'Text')
)
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
> const { createElement } = require('react')
> ```

**NB**: to get effect of `react-local` do not access properties via default imported React object (`React.*`), use named imports (just `StrictMode`, `Fragment` etc.)

**NB**: there are two ways to get effect of UglifyJS minification of variable names:

- use code inside non-global scope (inside function for example). Webpack and other bundlers will wrap you code automatically, only if you don't use it you need to take care of wrapping.
- use `toplevel` flag in UglifyJS.

### Babel configuration

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

## Other ways

There are also some other ways do something like this plugin do:

- `@babel/preset-react` + `webpack.ProvidePlugin` — see [article](https://medium.com/@jilizart/reduce-the-size-of-final-jsx-code-c39effca906f)
- `jsx-compress-loader` for webpack — see [repository](https://github.com/theKashey/jsx-compress-loader)

## License

This code is licensed under the MIT License. See license file to get more information.

Copyright Daniil Poroshin ([@philosaf](https://github.com/philosaf)).
