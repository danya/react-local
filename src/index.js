const { types: t, traverse } = require('@babel/core')

const VISITED = Symbol()

module.exports = () => ({
  pre() {
    this.injected = new Map()
  },

  visitor: {
    ImportDeclaration(path, state) {
      if (path.node.source.value !== 'react') return
      if (path.node[VISITED]) return

      const options = { declaration: 'const', extract: 'all', ...state.opts }

      const { variable, namedSpecifiers, locals } = getDataFromImportNode(
        path.node
      )

      if (!this.injected.has(state.filename)) {
        const injectable = ['createElement', 'Fragment']
        const inject = {}
        injectable.forEach(name => {
          const unique = path.scope.generateUidIdentifier(name).name
          const specifiers = emulateImportSpecifier(name, unique)
          namedSpecifiers.push(specifiers)
          inject[name] = unique
        })
        this.injected.set(state.filename, inject)
      }

      const amount = getAmountOfUse(
        locals,
        this.injected.get(state.filename),
        path.parent
      )
      const imports = {}
      const extract = {}

      const extractCount = options.extract === 'all' ? 0 : options.extract
      for (let i = 0, l = namedSpecifiers.length; i < l; i++) {
        const importedName = namedSpecifiers[i].imported.name
        const localName = namedSpecifiers[i].local.name
        const count = amount[localName]

        if (count >= extractCount) {
          extract[localName] = importedName
        } else if (count > 0) {
          imports[localName] = importedName
        }
      }

      const identifier = variable
        ? t.identifier(variable)
        : path.scope.generateUidIdentifier('React')
      const importNode = createImportNode(identifier, imports, 'react')
      importNode[VISITED] = true
      const extractNode =
        Object.keys(extract).length > 0
          ? createExtractNode(options.declaration, identifier, extract)
          : null

      path.replaceWithMultiple([importNode, extractNode].filter(Boolean))
    },

    MemberExpression(path, state) {
      const { object, property } = path.node
      const { name } = property

      if (object.name !== 'React') return
      if (t.isVariableDeclarator(path.parent)) return
      if (name !== 'createElement' && name !== 'Fragment') return

      const identifier = this.injected.get(state.filename)[name]
      const expression = t.expressionStatement(t.identifier(identifier))
      path.replaceWith(expression)
    }
  }
})

function getDataFromImportNode(node) {
  const { specifiers } = node

  const variable =
    t.isImportNamespaceSpecifier(specifiers[0]) ||
    t.isImportDefaultSpecifier(specifiers[0])
      ? specifiers[0].local.name
      : null
  const namedSpecifiers = specifiers.filter(t.isImportSpecifier)
  const locals = namedSpecifiers.map(s => s.local.name)

  return { variable, namedSpecifiers, locals }
}

function emulateImportSpecifier(imported, local) {
  return { imported: { name: imported }, local: { name: local } }
}

function getAmountOfUse(names, pragma, ast) {
  const amount = {}
  const increment = prop => (amount[prop] = (amount[prop] || 0) + 1)
  traverse(ast, {
    enter(path) {
      if (path.isImportDeclaration() && path.node.source.value === 'react') {
        path.skip()
      } else if (names.includes(path.node.name) && path.isIdentifier()) {
        increment(path.node.name)
      } else if (path.isJSXOpeningElement()) {
        increment(pragma.createElement)
        const name = path.node.name.name
        if (names.includes(name)) {
          increment(name)
        }
      } else if (path.isJSXFragment()) {
        increment(pragma.createElement)
        increment(pragma.Fragment)
      }
    }
  })
  return amount
}

function createImportNode(identifier, imports, source) {
  const specifiers = [
    t.importDefaultSpecifier(identifier),
    ...Object.keys(imports).map(name =>
      t.importSpecifier(t.identifier(name), t.identifier(imports[name]))
    )
  ]
  return t.importDeclaration(specifiers, t.stringLiteral(source))
}

function createExtractNode(kind, identifier, extract) {
  const id = t.objectPattern(
    Object.keys(extract).map(name =>
      t.objectProperty(t.identifier(extract[name]), t.identifier(name))
    )
  )
  return t.variableDeclaration(kind, [t.variableDeclarator(id, identifier)])
}
