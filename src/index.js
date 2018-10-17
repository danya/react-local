const t = require('@babel/types')

function plugin() {
  return {
    pre(state) {
      this.history = {}
    },

    visitor: {
      ImportDeclaration(path, state) {
        if (
          this.history[state.filename] ||
          path.node.source.value !== 'react'
        ) {
          return
        }

        const {
          pragma = 'createElement',
          pragmaFrag = 'Fragment',
          alwaysCreateElement = true,
          alwaysFragment = false,
          declaration = 'const'
        } = state.opts

        const names = path.node.specifiers
          .filter(s => s.type === 'ImportSpecifier')
          .map(s => s.imported.name)

        if (names.indexOf('createElement') === -1 && alwaysCreateElement) {
          names.push('createElement')
        }

        if (names.indexOf('Fragment') === -1 && alwaysFragment) {
          names.push('Fragment')
        }

        const properties = names.map(name => {
          const variable =
            name === 'createElement'
              ? pragma
              : name === 'Fragment'
                ? pragmaFrag
                : name

          return t.objectProperty(t.identifier(name), t.identifier(variable))
        })

        // Import React as default:
        // `import React from 'react'`
        const Import = t.importDeclaration(
          [t.importDefaultSpecifier(t.identifier('React'))],
          t.stringLiteral('react')
        )

        // Now get properties of React default export. For example:
        // `const {createElement: createElement, Fragment: Fragment} = React`
        const Variables = t.variableDeclaration(declaration, [
          t.variableDeclarator(
            t.objectPattern(properties),
            t.identifier('React')
          )
        ])

        // Then just replace old import declaration with the new one
        path.replaceWithMultiple([Import, Variables])

        this.history[state.filename] = true
      }
    }
  }
}

module.exports = plugin
