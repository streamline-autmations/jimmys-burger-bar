// Loads a TypeScript module from src/ in plain Node, using the project's own
// TypeScript compiler, without adding a test framework or a build step.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const cache = new Map();

export function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const nativeRequire = createRequire(file);
  const require = (name) => name.startsWith('.') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : nativeRequire(name);
  // Vite injects import.meta.env at build time; CommonJS has no import.meta,
  // so the tenant resolver would crash the loader. Substituting an empty env
  // makes it fall back to the default tenant.
  const source = fs.readFileSync(file, 'utf8').replace(/import\.meta\.env/g, '({})');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(require, module, module.exports);
  return module.exports;
}
