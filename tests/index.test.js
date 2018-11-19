const babel = require('@babel/core')
const plugin = require('../src')

function transform(input, options = {}) {
  return babel.transformSync(input, {
    presets: ['@babel/react'],
    plugins: [[plugin(), options]]
  }).code
}

it('does nothing if source is not `react`', function() {
  const input = `import {something} from 'some-where'`
  expect(transform(input)).toMatchSnapshot()
})

it('does nothing if there are no named improts from `react`', function() {
  const input = `import React from 'react'`
  expect(transform(input)).toMatchSnapshot()
})

it('does not extract imports if they are not used', function() {
  const input = `import {useState, useEffect} from 'react'`
  expect(transform(input)).toMatchSnapshot()
})

it('transforms namespaced import statement', function() {
  const input = `
    import * as React from 'react'
    const element = <div></div>
  `
  expect(transform(input)).toMatchSnapshot()
})

it('imports properties if they are used less than specfied', function() {
  const input = `
    import {useState, useEffect} from 'react'
    const state = useState(0)
    useEffect(() => {})
  `
  expect(transform(input, { extract: 2 })).toMatchSnapshot()
})

it('extracts properties if they are used more than specified (defaults to 0)', function() {
  const input = `
    import {useState} from 'react'
    const state1 = useState(0)
    const state2 = useState(0)
  `
  expect(transform(input)).toMatchSnapshot()
})

it('uses named imports and extract together', function() {
  const input = `
    import {useState, useEffect} from 'react'
    const state = useState(0)
    useEffect(() => {})
    useEffect(() => {})
  `
  expect(transform(input, { extract: 2 })).toMatchSnapshot()
})

it('imports/extracts properties used as JSX elements', function() {
  const input = `
    import {Suspense} from 'react'
    const element = <Suspense></Suspense>
  `
  expect(transform(input)).toMatchSnapshot()
})

it('automatically imports/extracts `createElement` if JSX is used', function() {
  const input = `
    import React from 'react'
    const element = <div></div>
  `
  expect(transform(input)).toMatchSnapshot()
})

it('automatically imports/extracts `Fragment` if it is used', function() {
  const input = `
    import React from 'react'
    const fragment = <></>
  `
  expect(transform(input)).toMatchSnapshot()
})

it('injects `createElement` and `Fragment` only once per file', function() {
  const input = `
    import * as React from 'react'
    import {useState} from 'react'
    const fragment = <></>
    const element = <div></div>
    const state = useState(0)
  `
  expect(transform(input)).toMatchSnapshot()
})

it('uses specified local name of imported properties', function() {
  const input = `
    import {useState as createState} from 'react'
    const state = createState(0)
  `
  expect(transform(input, { extract: 2 })).toMatchSnapshot()
})

it('uses specified local name of extracted properties', function() {
  const input = `
    import {useState as createState} from 'react'
    const state = createState(0)
  `
  expect(transform(input)).toMatchSnapshot()
})

it('uses specified name of default imported object', function() {
  const input = `
    import MyReact from 'react'
    const element = <div></div>
  `
  expect(transform(input)).toMatchSnapshot()
})

it('generates unique name in scope for default imported object', function() {
  const input = `
    import {useState} from 'react'
    const _React = 1;
    const state = useState(0)
  `
  expect(transform(input)).toMatchSnapshot()
})

it('uses specified declaration token and `const` by default', function() {
  const input = `
    import React from 'react'
    const element = <div></div>
  `
  expect(transform(input)).toMatchSnapshot()
  expect(transform(input, { declaration: 'var' })).toMatchSnapshot()
  expect(transform(input, { declaration: 'let' })).toMatchSnapshot()
})
