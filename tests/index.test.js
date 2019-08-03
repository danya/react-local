const babel = require('@babel/core')
const plugin = require('../src')

function transform(input) {
  return babel.transformSync(input, {
    plugins: [plugin()]
  }).code
}

it('creates local variables for named imports', () => {
  const input = `
    import React, {useState, useEffect} from 'react';
  `
  const output = transform(input)
  expect(output).toMatchSnapshot()
})

it('supports import aliasing', () => {
  const input = `
    import React, {useState as foo} from 'react';
  `
  const output = transform(input)
  expect(output).toMatchSnapshot()
})

it('supports import with no default import', () => {
  const input = `
    import {useState} from 'react';
  `
  const output = transform(input)
  expect(output).toMatchSnapshot()
})

it('supports mixed imports', () => {
  const input = `
    import React, {useEffect} from 'react'
    import {useState} from 'react';
  `
  const output = transform(input)
  expect(output).toMatchSnapshot()
})

it('transforms React.createElement calls', () => {
  const input = `
    import React from 'react';
    const element = React.createElement('div');
  `
  const output = transform(input)
  expect(output).toMatchSnapshot()
})
