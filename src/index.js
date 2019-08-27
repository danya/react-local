const { types: t } = require('@babel/core')

module.exports = function() {
  // Create variable declaration node with destructuring pattern and
  // insert it after first default or namespace import from react
  function createDestructuringNode(path, props) {
    // First specifier of import statement is default or namespace one
    const target = path.node.specifiers[0].local.name
    const declarator = t.variableDeclarator(
      t.objectPattern(
        props.map(specifier =>
          t.objectProperty(
            t.identifier(specifier.imported),
            t.identifier(specifier.local),
            false,
            specifier.imported === specifier.local
          )
        )
      ),
      t.identifier(target)
    )
    path.insertAfter(t.variableDeclaration('const', [declarator]))
    path.scope.registerDeclaration(path.getNextSibling())
  }

  function visitImportDeclaration(path, state) {
    if (path.node.source.value !== 'react') {
      return
    }

    // Collect named specifiers to list and remove them from the import
    // statement. Default and namespace specifiers are saved
    const imports = []
    const specifiers = path.get('specifiers')
    for (const specifier of specifiers) {
      if (t.isImportSpecifier(specifier)) {
        imports.push({
          imported: specifier.node.imported.name,
          local: specifier.node.local.name
        })
        specifier.remove()
      } else if (!state.generalImport) {
        // This is default or namespace specifier
        state.generalImport = path
      }
    }

    if (!state.generalImport) {
      // We need default or namespace import from React for variable declaration,
      // so if there is no default or namespace import just add it
      const id = path.scope.generateUidIdentifier('React')
      path.unshiftContainer('specifiers', [t.importDefaultSpecifier(id)])
      path.scope.registerDeclaration(path)
      state.generalImport = path
    } else {
      // In case we have multiple imports we can just remove the last one
      const updatedSpecifiers = path.get('specifiers')
      if (updatedSpecifiers.length === 0) {
        path.remove()
      }
    }

    if (imports.length > 0) {
      createDestructuringNode(state.generalImport, imports)
    }
  }

  function isReactImport(path) {
    const identifierName = path.node.name
    const binding = path.scope.getBinding(identifierName)
    if (
      t.isImportDefaultSpecifier(binding.path) ||
      t.isImportNamespaceSpecifier(binding.path)
    ) {
      const parentPath = binding.path.parentPath
      return parentPath.node.source.value === 'react'
    }
    return false
  }

  // Insert after import statement reference to `React.createElement`
  // and return its name for use across all AST
  function createCreateElementRef(path) {
    const reference = path.scope.generateUidIdentifier('createElement')
    const declaration = t.variableDeclaration('const', [
      t.variableDeclarator(
        reference,
        t.memberExpression(t.identifier('React'), t.identifier('createElement'))
      )
    ])
    path.insertAfter(declaration)
    path.scope.registerDeclaration(path.getNextSibling())
    return reference
  }

  // Transform each calling of `React.createElement` to calling of its
  // alias declared in a global scope (import statement scope)
  function visitCallExpression(path, state) {
    const callee = path.get('callee')
    if (t.isMemberExpression(callee)) {
      const object = callee.get('object')
      if (!isReactImport(object)) {
        return
      }
      const property = callee.get('property')
      if (t.isIdentifier(property) && property.node.name === 'createElement') {
        // We keep it in state to be sure we avoid name collision in each file
        if (!state.createElementRef) {
          state.createElementRef = createCreateElementRef(state.generalImport)
        }
        callee.replaceWith(state.createElementRef)
      }
    }
  }

  return {
    name: 'babel-plugin-react-local',
    visitor: {
      ImportDeclaration: visitImportDeclaration,
      CallExpression: visitCallExpression
    }
  }
}
