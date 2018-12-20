const { types: t, traverse } = require('@babel/core')

const VISITED = Symbol()

const CREATE_ELEMENT = Symbol()
const FRAGMENT = Symbol()
const INJECTABLE = { [CREATE_ELEMENT]: 'createElement', [FRAGMENT]: 'Fragment' }

module.exports = () => ({
  pre() {
    this.injected = new Map()
  },

  visitor: {
    ImportDeclaration(path, { opts, filename }) {
      if (path.node.source.value !== 'react') return
      if (path.node[VISITED]) return

      const options = { declaration: 'const', extract: 'all', ...opts }

      const { variable, namedSpecifiers, locals } = getDataFromImportNode(
        path.node
      )

      const imports = {}
      const extract = {}
      const amount = getAmountOfUse(locals, path.parent)
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

      if (!this.injected.has(filename)) {
        const inject = {}
        Object.getOwnPropertySymbols(INJECTABLE).forEach(key => {
          const count = amount[key]
          if (count > 0) {
            const importedName = INJECTABLE[key]
            const localName = path.scope.generateUidIdentifier(importedName)
            inject[importedName] = localName
            if (count >= extractCount) {
              extract[localName.name] = importedName
            } else {
              imports[localName.name] = importedName
            }
          }
        })
        this.injected.set(filename, inject)
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

    MemberExpression(path, { filename }) {
      const { object, property } = path.node
      const { name } = property

      if (object.name !== 'React') return
      if (t.isVariableDeclarator(path.parent)) return
      if (name !== 'createElement' && name !== 'Fragment') return

      const local = this.injected.get(filename)[name]
      if (local) {
        const expression = t.expressionStatement(local)
        path.replaceWith(expression)
      }
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

function getAmountOfUse(names, ast) {
  const amount = {}
  const increment = prop => (amount[prop] = (amount[prop] || 0) + 1)
  traverse(ast, {
    enter(path) {
      if (path.isImportDeclaration() && path.node.source.value === 'react') {
        path.skip()
      } else if (names.includes(path.node.name) && path.isIdentifier()) {
        increment(path.node.name)
      } else if (path.isJSXOpeningElement()) {
        increment(CREATE_ELEMENT)
        const name = path.node.name.name
        if (names.includes(name)) {
          increment(name)
        }
      } else if (path.isJSXFragment()) {
        increment(CREATE_ELEMENT)
        increment(FRAGMENT)
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
