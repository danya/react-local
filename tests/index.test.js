const babel = require('@babel/core')
const plugin = require('../src')

async function transform(input, options = {}) {
  return await babel.transform(input, {
    presets: ['@babel/react'],
    plugins: [[plugin(), options]]
  }).code
}

it('does nothing if source is not `react`', async function() {
  const input = `import {someFunction} from 'some-module'`
  expect(await transform(input)).toMatchSnapshot()
})

it('does not extract imports if there are no imports', async function() {
  const input = `import React from 'react'`
  expect(await transform(input)).toMatchSnapshot()
})

it('does not extract imports if they are not used', async function() {
  const input = `import {useState, useEffect} from 'react'`
  expect(await transform(input)).toMatchSnapshot()
})

it('imports properties if they are used once', async function() {
  const input = `
    import {useState} from 'react'
    const [color, setColor] = useState('red')
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('extracts properties if they are used twice or more', async function() {
  const input = `
    import {useState} from 'react'
    const [color, setColor] = useState('red')
    const [count, setCount] = useState(0)
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('automatically imports `createElement` if JSX is used once', async function() {
  const input = `
    import React from 'react'
    const Header = <h1>Text</h1>
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('automatically extracts `createElement` if JSX is used twice or more', async function() {
  const input = `
    import React from 'react'
    const Header = <h1>Text</h1>
    const Content = <p>Text</p>
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('automatically imports `Fragment` if it is used', async function() {
  const input = `
    import React from 'react'
    const Content = (
      <>
        <h1>Text</h1>
        <p>Text</p>
      </>
    )
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('uses specified local name of imported properties', async function() {
  const input = `
    import {useState as state} from 'react'
    const [color, setColor] = state('red')
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('uses specified local name of extracted properties', async function() {
  const input = `
    import {useState as state} from 'react'
    const [color, setColor] = state('red')
    const [count, setCount] = state(0)
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('uses specified name of default imported object', async function() {
  const input = `
    import MyReact from 'react'
    const Header = <h1>Text</h1>
    const Content = <p>Text</p>
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('transforms namespaced import statement', async function() {
  const input = `
    import * as React from 'react'
    const Header = <h1>Text</h1>
    const Content = <p>Text</p>
  `
  expect(await transform(input)).toMatchSnapshot()
})

it('uses specified declaration token and `const` by default', async function() {
  const input = `
    import React from 'react'
    const Header = <h1>Text</h1>
    const Content = <p>Text</p>
  `
  const output = await transform(input)
  expect(output).toMatchSnapshot()
  const outputVar = await transform(input, { declaration: 'var' })
  expect(outputVar).toMatchSnapshot()
  const outputLet = await transform(input, { declaration: 'let' })
  expect(outputLet).toMatchSnapshot()
})
