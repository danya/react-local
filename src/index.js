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
      const { imported, locals, identifier } = getDataFromImportNode(path.node)

      if (config.alwaysCreateElement && !imported.includes('createElement'))
        imported.push('createElement')
      if (config.alwaysFragment && !imported.includes('Fragment'))
        imported.push('Fragment')

      if (imported.length > 0) {
        const variable = identifier || 'React'

        // import statement
        const importNode = t.ImportDeclaration(
          [t.importDefaultSpecifier(t.identifier(variable))],
          t.stringLiteral('react')
        )

        // extract object statement
        const specified = locals.map((l, i) => (l !== imported[i] ? l : null))
        const properties = imported.map((name, i) =>
          t.objectProperty(
            t.identifier(name),
            t.identifier(specified[i] || config.pragmas[name] || name)
          )
        )
        const declarationNode = t.variableDeclaration(config.declaration, [
          t.variableDeclarator(
            t.objectPattern(properties),
            t.identifier(variable)
          )
        ])

        path.replaceWithMultiple([importNode, declarationNode])
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

function getDataFromImportNode(node) {
  const { specifiers } = node

  const identifier =
    // import * as React from 'react'
    specifiers[0].type === 'ImportNamespaceSpecifier' ||
    // import React, {...} from 'react'
    specifiers[0].type === 'ImportDefaultSpecifier'
      ? specifiers[0].local.name
      : // import {...} from 'react'
        undefined

  const namedSpecifiers = specifiers.filter(s => s.type === 'ImportSpecifier')
  const imported = namedSpecifiers.map(s => s.imported.name)
  const locals = namedSpecifiers.map(s => s.local.name)

  return { imported, locals, identifier }
}
