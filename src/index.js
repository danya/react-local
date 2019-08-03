const { types: t } = require('@babel/core')

module.exports = function() {
  // Transform named imports to local variables
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
      } else if (
        t.isImportDefaultSpecifier(specifier) ||
        t.isImportNamespaceSpecifier(specifier)
      ) {
        const local = specifier.get('local')
        // We need default or namespace import bounded to local
        // variable `React` because this name is used as default
        // pragma in Babel's JSX compiler
        if (local.node.name === 'React') {
          state.generalImport = path
        }
      }
    }
    // We need default or namespace import from React for
    // variable declaration, so if there is no default or
    // namespace import just add it
    if (!state.generalImport) {
      const defaultSpecifier = t.importDefaultSpecifier(t.identifier('React'))
      path.pushContainer('specifiers', [defaultSpecifier])
      path.scope.registerDeclaration(path)
      state.generalImport = path
    }
    // In case we have multiple imports we can just remove the last
    // one because we can use default import from the first statement
    const updatedSpecifiers = path.get('specifiers')
    if (updatedSpecifiers.length === 0) {
      path.remove()
    }
    // Create a destructuring variable declaration
    if (imports.length > 0) {
      const declarator = t.variableDeclarator(
        t.objectPattern(
          imports.map(specifier =>
            t.objectProperty(
              t.identifier(specifier.imported),
              t.identifier(specifier.local),
              false,
              specifier.imported === specifier.local
            )
          )
        ),
        t.identifier('React')
      )
      // Every time insert variable declaration right after the first
      // import statement with default or namespace specifiers bounded to `React`
      const importPath = state.generalImport
      importPath.insertAfter(t.variableDeclaration('const', [declarator]))
      importPath.scope.registerDeclaration(path.getNextSibling())
    }
  }

  // Check if object in member expression is reference to React
  function isReactImport(path) {
    const identifierName = path.node.name
    const binding = path.scope.getBinding(identifierName)
    if (
      t.isImportDefaultSpecifier(binding.path) ||
      t.isImportNamespaceSpecifier(binding.path)
    ) {
      const parentPath = binding.path.parentPath
      return (
        t.isImportDeclaration(parentPath) &&
        parentPath.node.source.value === 'react'
      )
    }
    return false
  }

  // Insert after import statement reference to `React.createElement`
  // and return its name for use across all AST
  function createCreateElementRef(importPath) {
    const reference = importPath.scope.generateUidIdentifier('createElement')
    const declaration = t.variableDeclaration('const', [
      t.variableDeclarator(
        reference,
        t.memberExpression(t.identifier('React'), t.identifier('createElement'))
      )
    ])
    importPath.insertAfter(declaration)
    importPath.scope.registerDeclaration(importPath.getNextSibling())
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
