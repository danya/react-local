const babel = require('@babel/core')
const plugin = require('../src')

const options = { plugin: true, env: false }
const input = `
  import * as React from 'react'
  function App() {
    return (
      <>
        <h1>Header</h1>
        <p>Text</p>
      </>
    )
  }
`

function transform(code, options) {
  const plugins = options.plugin
    ? [[plugin(), typeof options.plugin === 'object' ? options.plugin : {}]]
    : []
  return babel.transformSync(code, {
    presets: ['@babel/react', options.env && '@babel/env'].filter(Boolean),
    plugins
  }).code
}

// eslint-disable-next-line no-console
console.log(transform(input, options))
