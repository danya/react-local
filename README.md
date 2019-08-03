# React Local

Babel plugin that optimize your React application transforming your imports to local variables.

**It much reduces:**

- **amount of code browser need to parse and compile** (see [explanation](#explanation))
- and therefore **time of all JavaScript execution** (see [Jeremy Wagner's article](https://developers.google.com/web/fundamentals/performance/optimizing-javascript/tree-shaking/) on Web Fundamentals and Addy Osmani's article "[The Cost of JavaScript](https://medium.com/dev-channel/the-cost-of-javascript-84009f51e99e)")

### Example:

```javascript
// `o.a` is React's default import object after webpack in production mode
// With react-local:
const h = o.a.createElement
const { useState: b } = o.a
function C() {
  const c = b(0)
  const d = b(0)
  return h('div', null, h('h1', null, 'Header'), h('p', null, 'Text'))
}
// Original code:
function C() {
  const c = o.a.useState(0)
  const d = o.a.useState(0)
  return o.a.createElement(
    'div',
    null,
    o.a.createElement('h1', null, 'Header'),
    o.a.createElement('p', null, 'Text')
  )
}
```

## Installation

```shell
npm i --save-dev babel-plugin-react-local
yarn add --dev babel-plugin-react-local
```

To use this plugin just put `react-local` to `plugins` field in Babel configuration. **It works out of box!**

## Explanation

When using React, a lot of extra code is created because React uses `React.createElement` pragma for JSX and it (and other imports) cannot be well mangled. When you use standard options of Babel minifiers don’t know `.default.createElement` or similar property is constant so it can’t mangle property access. But when using `react-local` you can solve this problem. This works because your imports are assigned to a local variables, and then used multiple times. So minifiers can mangle the variable name. For example, `react-local` reduces ~1 KB for each ~62 calling of `createElement`.

## Usage notes

- `react-local` works only with ES6 Modules because it looks for `import` statement.

- To get effect of `react-local` do not access properties via default imported React object (`React.*`), use named imports (just `useState`, `useEffect` etc.)

- If you use **TypeScript** you might be used to import React with namespace import declaration (`import * as React from 'react'`). It can produce some problems, in case of react-local only `createElement` will be extracted to local variable. To solve this problem you can use `esModuleInterop` option in TS compiler configuration and use named imports. To know more read this [article](https://itnext.io/great-import-schism-typescript-confusion-around-imports-explained-d512fc6769c2).

* In **Flow** when importing React as an ES module you may use either style, but importing as a namespace gives you access to React's utility types (e.g. `React.AbstractComponent`, `React.Ref`). In the latter case as well as in the case of TypeScript react-local will extract only `createElement` and `Fragment`. It will bring a good effect, but if you want more just use such syntax:

  ```javascript
  import React, { useState } from 'react'
  import type { AbstractComponent } from 'react'
  ```
