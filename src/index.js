const {types: t, traverse} = require('@babel/core');

const VISITED = Symbol();
const CREATE_ELEMENT = Symbol();
const FRAGMENT = Symbol();

module.exports = () => ({
  name: 'babel-plugin-react-local',

  pre() {
    this.autoimport = new Map();
  },

  visitor: {
    ImportDeclaration(path, {opts, filename}) {
      if (path.node.source.value !== 'react' || path.node[VISITED]) return;

      const options = {declaration: 'const', extract: 'all', ...opts};

      const {variable, namedSpecifiers, locals} = getDataFromImportNode(
        path.node
      );
      const specifiers = [...namedSpecifiers];
      const usageCount = getUsageCount(locals, path.parent);
      const extractCount = options.extract === 'all' ? 0 : options.extract;
      const imports = {};
      const extract = {};

      if (!this.autoimport.has(filename)) {
        const autoimport = {};
        [CREATE_ELEMENT, FRAGMENT].forEach(name => {
          if (usageCount[name] === 0) return;
          const importedName =
            name === CREATE_ELEMENT ? 'createElement' : 'Fragment';
          const localName = path.scope.generateUidIdentifier(importedName);

          specifiers.push(
            t.importSpecifier(localName, t.identifier(importedName))
          );
          usageCount[localName.name] = usageCount[name];
          autoimport[importedName] = localName;
        });
        this.autoimport.set(filename, autoimport);
      }

      for (let i = 0, l = specifiers.length; i < l; i++) {
        const importedName = specifiers[i].imported.name;
        const localName = specifiers[i].local.name;
        const count = usageCount[localName];
        if (count >= extractCount) {
          extract[localName] = importedName;
        } else if (count > 0) {
          imports[localName] = importedName;
        }
      }

      const identifier = variable
        ? t.identifier(variable)
        : path.scope.generateUidIdentifier('React');
      const importNode = createImportNode(identifier, imports, 'react');
      importNode[VISITED] = true;
      const extractNode =
        Object.keys(extract).length > 0
          ? createExtractNode(options.declaration, identifier, extract)
          : null;

      path.replaceWithMultiple([importNode, extractNode].filter(Boolean));
    },

    MemberExpression(path, {filename}) {
      if (
        path.node.object.name !== 'React' ||
        t.isVariableDeclarator(path.parent) ||
        (path.node.property.name !== 'createElement' &&
          path.node.property.name !== 'Fragment')
      ) {
        return;
      }

      const localName = this.autoimport.get(filename)[path.node.property.name];
      if (localName) {
        const expression = t.expressionStatement(localName);
        path.replaceWith(expression);
      }
    },
  },
});

function getDataFromImportNode(node) {
  const {specifiers} = node;
  const variable =
    t.isImportNamespaceSpecifier(specifiers[0]) ||
    t.isImportDefaultSpecifier(specifiers[0])
      ? specifiers[0].local.name
      : null;
  const namedSpecifiers = specifiers.filter(t.isImportSpecifier);
  const locals = namedSpecifiers.map(s => s.local.name);

  return {variable, namedSpecifiers, locals};
}

function getUsageCount(names, ast) {
  const amount = {};
  const inc = prop => (amount[prop] = (amount[prop] || 0) + 1);
  traverse(ast, {
    enter(path) {
      if (path.isImportDeclaration() && path.node.source.value === 'react') {
        path.skip();
      } else if (names.includes(path.node.name) && path.isIdentifier()) {
        inc(path.node.name);
      } else if (path.isJSXOpeningElement()) {
        inc(CREATE_ELEMENT);
        const name = path.node.name.name;
        if (names.includes(name)) {
          inc(name);
        }
      } else if (path.isJSXFragment()) {
        inc(CREATE_ELEMENT);
        inc(FRAGMENT);
      }
    },
  });
  return amount;
}

function createImportNode(identifier, imports, source) {
  const specifiers = [
    t.importDefaultSpecifier(identifier),
    ...Object.keys(imports).map(name =>
      t.importSpecifier(t.identifier(name), t.identifier(imports[name]))
    ),
  ];
  return t.importDeclaration(specifiers, t.stringLiteral(source));
}

function createExtractNode(kind, identifier, extract) {
  const id = t.objectPattern(
    Object.keys(extract).map(name =>
      t.objectProperty(t.identifier(extract[name]), t.identifier(name))
    )
  );
  return t.variableDeclaration(kind, [t.variableDeclarator(id, identifier)]);
}
