// Static check for the source modules loaded by Vercel's native Node ESM runtime.
// --fix adds explicit .js / index.js paths; it does not execute application code.
import ts from 'typescript';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const entries = ['api/business.ts', 'api/_lib/assistantBeta/handler.ts'];
const visited = new Set();
const problems = [];

function resolveSource(file, specifier) {
  const path = resolve(dirname(file), specifier);
  const stem = path.replace(/\.js$/, '');
  return [path, `${stem}.ts`, `${stem}.tsx`, resolve(path, 'index.ts'), resolve(path, 'index.tsx')]
    .find((candidate) => /\.(?:ts|tsx)$/.test(candidate) && existsSync(candidate));
}

function visit(file) {
  if (visited.has(file)) return;
  visited.add(file);
  const source = readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const replacements = [];
  function inspect(node) {
    let literal;
    if (ts.isImportDeclaration(node)) {
      if (node.importClause?.isTypeOnly) return;
      const bindings = node.importClause?.namedBindings;
      if (!node.importClause?.name && bindings && ts.isNamedImports(bindings)
        && bindings.elements.length && bindings.elements.every((item) => item.isTypeOnly)) return;
      literal = node.moduleSpecifier;
    } else if (ts.isExportDeclaration(node)) {
      if (node.isTypeOnly) return;
      literal = node.moduleSpecifier;
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      literal = node.arguments[0];
    }
    if (literal && ts.isStringLiteral(literal) && literal.text.startsWith('.')) {
      const dependency = resolveSource(file, literal.text);
      if (!dependency) {
        problems.push(`${relative(root, file)}: unresolved ${literal.text}`);
        return;
      }
      if (!extname(literal.text)) {
        let explicit = relative(dirname(file), dependency).split(sep).join('/').replace(/\.tsx?$/, '.js');
        if (!explicit.startsWith('.')) explicit = `./${explicit}`;
        problems.push(`${relative(root, file)}: ${literal.text} -> ${explicit}`);
        replacements.push({ start: literal.getStart(ast) + 1, end: literal.getEnd() - 1, text: explicit });
      }
      visit(dependency);
    }
    ts.forEachChild(node, inspect);
  }
  inspect(ast);
  if (process.argv.includes('--fix') && replacements.length) {
    let output = source;
    for (const item of replacements.sort((a, b) => b.start - a.start)) output = output.slice(0, item.start) + item.text + output.slice(item.end);
    writeFileSync(file, output);
  }
}
entries.forEach((entry) => visit(resolve(root, entry)));
if (problems.length) console.log(problems.join('\n'));
console.log(`Inspected ${visited.size} server dependencies; ${problems.length} unresolved or implicit runtime imports${process.argv.includes('--fix') ? ' (explicit paths written where resolvable)' : ''}.`);
if (problems.length && !process.argv.includes('--fix')) process.exitCode = 1;
