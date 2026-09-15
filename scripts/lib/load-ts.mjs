// Loads a TypeScript module from src/ in plain Node, using the project's own
// TypeScript compiler, without adding a test framework or a build step.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const cache = new Map();

function loadModule(file, moduleCache, env) {
  file = path.resolve(file);
  if (moduleCache.has(file)) return moduleCache.get(file).exports;
  const module = { exports: {} };
  moduleCache.set(file, module);
  const nativeRequire = createRequire(file);
  const require = (name) => name.startsWith('.')
    ? loadModule(path.resolve(path.dirname(file), `${name}.ts`), moduleCache, env)
    : nativeRequire(name);
  // Vite injects import.meta.env at build time; CommonJS has no import.meta,
  // so replace it with the environment supplied by the caller.
  const source = fs.readFileSync(file, 'utf8').replace(/import\.meta\.env/g, `(${JSON.stringify(env)})`);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(require, module, module.exports);
  return module.exports;
}

export function load(file) {
  return loadModule(file, cache, {});
}

/** Load a TypeScript module and all of its local imports with a fresh cache. */
export function loadWithEnv(file, env) {
  return loadModule(file, new Map(), env);
}
