This project is part of my early *experiments* with compilers.

Example:

```javascript
// `o.a` is react's default import object after webpack in production mode
// With this plugin
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
