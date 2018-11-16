const t = require('@babel/types')

module.exports = () => ({
  pre() {
    this.history = new Set()
  },

  visitor: {
    ImportDeclaration(path, state) {
      if (this.history.has(state.filename)) return
      if (path.node.source.value !== 'react') return

      const {
        variable,
        namedSpecifiers,
        imported,
        locals
      } = getDataFromImportNode(path.node)

      if (!imported.includes('createElement')) {
        namedSpecifiers.push(emulateImportSpecifier('createElement'))
      }
      if (!imported.includes('Fragment')) {
        namedSpecifiers.push(emulateImportSpecifier('Fragment'))
      }

      const importIndex = path.parent.body.indexOf(path.node)
      const ast = JSON.parse(JSON.stringify(path.parent))
      ast.body[importIndex] = false

      const amount = getAmountOfUse(locals, ast)

      const imports = {}
      const extract = {}

      for (let i = 0, l = namedSpecifiers.length; i < l; i++) {
        const importedName = namedSpecifiers[i].imported.name
        const localName = namedSpecifiers[i].local.name
        const count = amount[localName]

        // TODO: Add error on wrong type
        if (state.opts.extract === 'all' && count > 0) {
          extract[importedName] = localName
        } else {
          if (count >= (state.opts.extract || 2)) {
            extract[importedName] = localName
          } else if (count > 0) {
            imports[importedName] = localName
          }
        }
      }

      const identifier = variable
        ? t.identifier(variable)
        : path.scope.generateUidIdentifier('React')
      const importNode = createImportNode(identifier, imports, 'react')
      const extractNode =
        Object.keys(extract).length > 0
          ? createExtractNode(state.opts.declaration, identifier, extract)
          : null

      path.replaceWithMultiple([importNode, extractNode].filter(Boolean))

      this.history.add(state.filename)
    },

    MemberExpression(path) {
      const {
        object,
        property: { name }
      } = path.node

      if (object.name !== 'React') return
      if (name !== 'createElement' && name !== 'Fragment') return
      if (t.isVariableDeclarator(path.parent)) return

      const expression = t.expressionStatement(t.identifier(name))
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
  const imported = namedSpecifiers.map(s => s.imported.name)
  const locals = namedSpecifiers.map(s => s.local.name)

  return { variable, namedSpecifiers, imported, locals }
}

function emulateImportSpecifier(name) {
  return { imported: { name }, local: { name } }
}

function getAmountOfUse(names, ast) {
  const amount = {}
  t.traverse(ast, {
    enter(path) {
      // TODO: Rewrite it
      if (names.includes(path.name) && t.isIdentifier(path)) {
        const name = path.name
        amount[name] = (amount[name] || 0) + 1
      } else if (t.isJSXElement(path)) {
        amount.createElement = (amount.createElement || 0) + 1
      } else if (t.isJSXFragment(path)) {
        amount.createElement = (amount.createElement || 0) + 1
        amount.Fragment = (amount.Fragment || 0) + 1
      }
    }
  })
  return amount
}

function createImportNode(identifer, imports, source) {
  const specifiers = Object.keys(imports).map(name =>
    t.importSpecifier(t.identifier(imports[name]), t.identifier(name))
  )

  return t.importDeclaration(
    [t.importDefaultSpecifier(identifer), ...specifiers],
    t.stringLiteral(source)
  )
}

function createExtractNode(kind = 'const', identifier, extract) {
  const properties = Object.keys(extract).map(name =>
    t.objectProperty(t.identifier(name), t.identifier(extract[name]))
  )

  return t.variableDeclaration(kind, [
    t.variableDeclarator(t.objectPattern(properties), identifier)
  ])
}
