const t = require('@babel/types')

function plugin() {
  return {
    pre() {
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

        // Plugin options
        const {
          pragma = 'createElement',
          pragmaFrag = 'Fragment',
          alwaysCreateElement = true,
          alwaysFragment = false,
          declaration = 'const'
        } = state.opts
        const pragmas = { createElement: pragma, Fragment: pragmaFrag }

        // Import specifiers
        const names = []
        const locals = []

        path.node.specifiers
          .filter(s => s.type === 'ImportSpecifier')
          .forEach(({ imported, local }) => {
            names.push(imported.name)
            locals.push(imported.name !== local.name ? local.name : null)
          })

        if (alwaysCreateElement && names.indexOf('createElement') < 0) {
          names.push('createElement')
        }

        if (alwaysFragment && names.indexOf('Fragment') < 0) {
          names.push('Fragment')
        }

        // Replace node if there're necessary imports
        if (names.length > 0) {
          // Import React as default:
          // `import React from 'react'`
          const Import = t.importDeclaration(
            [t.importDefaultSpecifier(t.identifier('React'))],
            t.stringLiteral('react')
          )

          // Extract properties for React default export as local vars:
          // `const {createElement: createElement, Fragment: Fragment} = React`
          const properties = names.map((name, i) =>
            t.objectProperty(
              t.identifier(name),
              t.identifier(locals[i] || pragmas[name] || name)
            )
          )

          const Variables = t.variableDeclaration(declaration, [
            t.variableDeclarator(
              t.objectPattern(properties),
              t.identifier('React')
            )
          ])

          path.replaceWithMultiple([Import, Variables])
        }

        this.history[state.filename] = true
      }
    }
  }
}

module.exports = plugin
