const babel = require('@babel/core')
const plugin = require('../src')

function transform(input, options = {}) {
  return babel.transformSync(input, {
    presets: ['@babel/react'],
    plugins: [[plugin(), options]]
  }).code
}

it('does nothing if source is not `react`', function() {
  const input = `import {someFunction} from 'some-module'`
  expect(transform(input)).toMatchSnapshot()
})

it('does not extract imports if there are no imports', function() {
  const input = `import React from 'react'`
  expect(transform(input)).toMatchSnapshot()
})

it('does not extract imports if they are not used', function() {
  const input = `import {useState, useEffect} from 'react'`
  expect(transform(input)).toMatchSnapshot()
})

it('imports properties if they are used less than specfied', function() {
  const input = `
    import {useState} from 'react'
    const [color, setColor] = useState('red')
  `
  expect(transform(input, { extract: 2 })).toMatchSnapshot()
})

it('extracts properties if they are used twice or more', function() {
  const input = `
    import {useState} from 'react'
    const [color, setColor] = useState('red')
    const [count, setCount] = useState(0)
  `
  expect(transform(input)).toMatchSnapshot()
})

it('automatically imports `createElement` if JSX is used less than specified', function() {
  const input = `
    import React from 'react'
    const Header = <h1>Text</h1>
  `
  expect(transform(input, { extract: 2 })).toMatchSnapshot()
})

it('automatically extracts `createElement` if JSX is used', function() {
  const input = `
    import React from 'react'
    const Header = <h1>Text</h1>
    const Content = <p>Text</p>
  `
  expect(transform(input)).toMatchSnapshot()
})

it('automatically imports/extracts `Fragment` if it is used', function() {
  const input = `
    import React from 'react'
    const Content = (
      <>
        <h1>Text</h1>
        <p>Text</p>
      </>
    )
  `
  expect(transform(input, { extract: 2 })).toMatchSnapshot()
})

it('uses specified local name of imported properties', function() {
  const input = `
    import {useState as state} from 'react'
    const [color, setColor] = state('red')
  `
  expect(transform(input, { extract: 2 })).toMatchSnapshot()
})

it('uses specified local name of extracted properties', function() {
  const input = `
    import {useState as state} from 'react'
    const [color, setColor] = state('red')
    const [count, setCount] = state(0)
  `
  expect(transform(input)).toMatchSnapshot()
})

it('uses specified name of default imported object', function() {
  const input = `
    import MyReact from 'react'
    const Header = <h1>Text</h1>
    const Content = <p>Text</p>
  `
  expect(transform(input)).toMatchSnapshot()
})

it('transforms namespaced import statement', function() {
  const input = `
    import * as React from 'react'
    const Header = <h1>Text</h1>
    const Content = <p>Text</p>
  `
  expect(transform(input)).toMatchSnapshot()
})

it('uses specified declaration token and `const` by default', function() {
  const input = `
    import React from 'react'
    const Header = <h1>Text</h1>
    const Content = <p>Text</p>
  `
  const output = transform(input)
  expect(output).toMatchSnapshot()
  const outputVar = transform(input, { declaration: 'var' })
  expect(outputVar).toMatchSnapshot()
  const outputLet = transform(input, { declaration: 'let' })
  expect(outputLet).toMatchSnapshot()
})

it('injects `createElement` and `Fragment` only once per file', function() {
  const input = `
    import React from 'react'
    import {useState} from 'react'
    const state = useState(0)
    const fragment = <></>
    const element = <h1></h1>
  `
  expect(transform(input)).toMatchSnapshot()
})
