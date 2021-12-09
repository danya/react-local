*Note:* since there is the new [JSX transform](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html), it might make sense to prefer the official plugin.

This plugin transforms ES6-style imports from React that cannot be mangled (because with standard options minifiers don't know if property access is constant or not) to local variables. 

Example:

```javascript
// Original code:
function render() {
  const [v, s] = a.b.useState(0)
  return a.b.createElement('p', null, 'Text', v)
}

// Modified code:
const h = a.b.createElement
const { useState: f } = a.b
function render() {
  const [v, s] = f(0)
  return h('p', null, 'Text', v)
}
```