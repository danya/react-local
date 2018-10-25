const babel = require('@babel/core')
const plugin = require('../src')

async function transform(input, options = {}) {
  return await babel.transform(input, {
    plugins: [[plugin(), options]]
  }).code
}

it('do nothing if source is not `react`', async function() {
  const input = `import {someFunction} from 'some-module'`
  const output = await transform(input)
  expect(output).toMatchSnapshot()
})

it('do not extract imports if it is not necessary', async function() {
  const input = `import React from 'react'`
  const output = await transform(input, { alwaysCreateElement: false })
  expect(output).toMatchSnapshot()
})

it('extract React imports to local vars', async function() {
  const input = `import {Fragment, Suspense} from 'react'`
  const output = await transform(input)
  expect(output).toMatchSnapshot()
})

it('always imports `createElement` if option is enabled', async function() {
  const input = `import React from 'react'`
  const output = await transform(input)
  expect(output).toMatchSnapshot()
})

it('do not always import `createElement` if option is disabled', async function() {
  const input = `import React, {Fragment} from 'react'`
  const output = await transform(input, { alwaysCreateElement: false })
  expect(output).toMatchSnapshot()
})

it('always imports `Fragment` if option is enabled', async function() {
  const input = `import React from 'react'`
  const output = await transform(input, { alwaysFragment: true })
  expect(output).toMatchSnapshot()
})

it('uses specified `pragma` and `pragmaFrag`', async function() {
  const input = `import {Fragment} from 'react'`
  const output = await transform(input, {
    pragma: 'specifiedCE',
    pragmaFrag: 'specifiedFragment'
  })
  expect(output).toMatchSnapshot()
})

it('uses specified declaration token and `const` by default', async function() {
  const input = `import React from 'react'`
  const output = await transform(input)
  expect(output).toMatchSnapshot()
  const outputVar = await transform(input, { declaration: 'var' })
  expect(outputVar).toMatchSnapshot()
  const outputLet = await transform(input, { declaration: 'let' })
  expect(outputLet).toMatchSnapshot()
})
