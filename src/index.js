const t = require('@babel/types')

module.exports = () => ({
  pre() {
    this.history = new Set()
  },

  visitor: {
    ImportDeclaration(path, state) {
      if (this.history.has(state.filename)) return
      if (path.node.source.value !== 'react') return

      const pragmas = {
        createElement: state.opts.pragma || 'createElement',
        Fragment: state.opts.pragmaFrag || 'Fragment'
      }

      const {
        alwaysCreateElement = true,
        alwaysFragment = false,
        declaration = 'const'
      } = state.opts

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

      if (names.length > 0) {
        const importNode = t.importDeclaration(
          [t.importDefaultSpecifier(t.identifier('React'))],
          t.stringLiteral('react')
        )

        const properties = names.map((name, i) => {
          const variable = locals[i] || pragmas[name] || name
          return t.objectProperty(t.identifier(name), t.identifier(variable))
        })

        const extractNode = t.variableDeclaration(declaration, [
          t.variableDeclarator(
            t.objectPattern(properties),
            t.identifier('React')
          )
        ])

        path.replaceWithMultiple([importNode, extractNode])
      }

      this.history.add(state.filename)
    }
  }
})
