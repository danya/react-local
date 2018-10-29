const t = require('@babel/types')

module.exports = () => ({
  pre() {
    this.history = new Set()
  },

  visitor: {
    ImportDeclaration(path, state) {
      if (this.history.has(state.filename)) return
      if (path.node.source.value !== 'react') return

      const config = prepareConfig(state.opts)
      const {
        names,
        locals,
        identifier = 'React'
      } = getDataFromImportSpecifiers(path.node.specifiers)

      if (config.alwaysCreateElement && !names.includes('createElement'))
        names.push('createElement')
      if (config.alwaysFragment && !names.includes('Fragment'))
        names.push('Fragment')

      if (names.length > 0) {
        // import statement
        const importNode = t.ImportDeclaration(
          [t.importDefaultSpecifier(t.identifier(identifier))],
          t.stringLiteral('react')
        )

        // extract object statement
        const specified = locals.map((l, i) => (l !== names[i] ? l : null))
        const properties = names.map((name, i) =>
          t.objectProperty(
            t.identifier(name),
            t.identifier(specified[i] || config.pragmas[name] || name)
          )
        )
        const extractNode = t.variableDeclaration(config.declaration, [
          t.variableDeclarator(
            t.objectPattern(properties),
            t.identifier(identifier)
          )
        ])

        path.replaceWithMultiple([importNode, extractNode])
      }

      this.history.add(state.filename)
    }
  }
})

function prepareConfig(options) {
  const pragmas = {
    createElement: options.pragma,
    Fragment: options.pragmaFrag
  }
  const {
    alwaysCreateElement = true,
    alwaysFragment = false,
    declaration = 'const'
  } = options
  return { alwaysCreateElement, alwaysFragment, declaration, pragmas }
}

function getDataFromImportSpecifiers(specifiers) {
  // `import * as React from 'react'`
  if (specifiers[0].type === 'ImportNamespaceSpecifier') {
    return { names: [], locals: [], identifier: specifiers[0].local.name }
  }
  // `import React, {...} from 'react'`
  else {
    const identifier =
      specifiers[0].type === 'ImportDefaultSpecifier'
        ? specifiers[0].local.name
        : undefined

    const namedSpecifiers = specifiers.filter(s => s.type === 'ImportSpecifier')
    const names = namedSpecifiers.map(s => s.imported.name)
    const locals = namedSpecifiers.map(s => s.local.name)

    return { names, locals, identifier }
  }
}
