/**
 * Vendors the published TypeScript sources for the selected Solana program clients.
 *
 * The script keeps the vendored tree intentionally simple:
 * - read the installed package's runtime source map and reconstruct its `src/` files,
 * - rewrite `@solana/kit` imports to local compatibility shims,
 * - synthesize missing `index.ts` barrel files,
 * - preserve the upstream package-root `index.ts` surface and prepend a provenance header,
 * - regenerate a narrow `src/__generated__/kit-shims/index.ts` from the actual vendored
 *   import surface so Rollup sees explicit leaf-package exports instead of a broad umbrella shim.
 *
 * The script deliberately does not patch vendored program logic. Any true local fixes should stay
 * as explicit follow-up edits so the vendored source remains easy to compare against upstream.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, '..');
const manifestPath = path.join(
  workspaceRoot,
  'scripts',
  'vendor-program-clients.manifest.json',
);
const generatedRoot = path.join(
  workspaceRoot,
  'src',
  '__generated__',
  'program-clients',
);
const kitShimsRoot = path.join(workspaceRoot, 'src', '__generated__', 'kit-shims');
const kitShimIndexPath = path.join(kitShimsRoot, 'index.ts');

const IMPORT_REWRITES = Object.freeze([
  [
    '@solana/kit/program-client-core',
    path.join(kitShimsRoot, 'program-client-core.ts'),
  ],
  ['@solana/kit', path.join(kitShimsRoot, 'index.ts')],
]);

// `Rpc` resolves through a deeper declaration package, but this repository intentionally keeps
// `@solana/rpc` as the public dependency boundary for that type.
const KIT_SHIM_PACKAGE_OVERRIDES = Object.freeze({
  Rpc: '@solana/rpc',
});

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

  await fs.mkdir(generatedRoot, {recursive: true});

  for (const entry of manifest) {
    await vendorProgramClient(entry);
  }

  await writeExplicitKitShimIndex();
}

async function vendorProgramClient({
  outputName,
  packageName,
  runtimeEntry,
}) {
  const outputDir = getSafeVendoredOutputDir(outputName);
  const vendoredPackage = await getVendoredPackageContext({
    outputDir,
    packageName,
    runtimeEntry,
  });

  await fs.rm(outputDir, {recursive: true, force: true});
  await fs.mkdir(vendoredPackage.outputDir, {recursive: true});

  validateVendoredSourceMap(vendoredPackage);
  await writeVendoredSourceFiles(vendoredPackage);
  await synthesizeBarrelFiles(vendoredPackage.outputDir);
  await prependVendoredPackageHeader(vendoredPackage);
}

async function getVendoredPackageContext({outputDir, packageName, runtimeEntry}) {
  const packageJsonPath = await findNearestPackageJson(require.resolve(packageName));
  const packageRoot = path.dirname(packageJsonPath);
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  const runtimeEntryPath = path.join(packageRoot, runtimeEntry);

  return {
    outputDir,
    packageName,
    packageSourceRoot: path.join(packageRoot, 'src'),
    runtimeEntryPath,
    sourceMap: JSON.parse(await fs.readFile(`${runtimeEntryPath}.map`, 'utf8')),
    version: packageJson.version,
  };
}

// Vendored outputs may only be direct children of src/__generated__/program-clients.
// This keeps the recursive delete in cleanVendoredOutputDir contained to the vendored subtree.
function getSafeVendoredOutputDir(outputName) {
  if (
    outputName === '' ||
    outputName === '.' ||
    outputName === '..' ||
    outputName !== path.basename(outputName)
  ) {
    throw new Error(`Invalid vendored output name: ${outputName}`);
  }

  return path.join(generatedRoot, outputName);
}

function validateVendoredSourceMap({packageName, sourceMap, version}) {
  if (
    !Array.isArray(sourceMap.sources) ||
    !Array.isArray(sourceMap.sourcesContent) ||
    sourceMap.sources.length !== sourceMap.sourcesContent.length
  ) {
    throw new Error(
      `Expected ${packageName}@${version} source map to include matched sources and sourcesContent arrays.`,
    );
  }
}

async function writeVendoredSourceFiles({
  outputDir,
  packageName,
  packageSourceRoot,
  runtimeEntryPath,
  sourceMap,
  version,
}) {
  await Promise.all(
    sourceMap.sources.map(async (sourceRelativePath, index) => {
      const sourceContent = sourceMap.sourcesContent[index];
      if (typeof sourceContent !== 'string') {
        throw new Error(
          `Expected ${packageName}@${version} source map to embed source content for ${sourceRelativePath}.`,
        );
      }

      const absoluteSourcePath = path.resolve(
        path.dirname(runtimeEntryPath),
        sourceRelativePath,
      );
      if (!absoluteSourcePath.startsWith(`${packageSourceRoot}${path.sep}`)) {
        throw new Error(
          `Expected vendored source ${absoluteSourcePath} to live under ${packageSourceRoot}.`,
        );
      }

      const outputPath = path.join(
        outputDir,
        path.relative(packageSourceRoot, absoluteSourcePath),
      );
      await fs.mkdir(path.dirname(outputPath), {recursive: true});
      await fs.writeFile(
        outputPath,
        rewriteKitImports(sourceContent, outputPath),
      );
    }),
  );
}

function rewriteKitImports(fileContents, outputPath) {
  let rewrittenFileContents = fileContents;

  for (const [specifier, shimPath] of IMPORT_REWRITES) {
    if (!rewrittenFileContents.includes(specifier)) {
      continue;
    }

    const relativePath = path
      .relative(path.dirname(outputPath), shimPath)
      .replace(/\.ts$/, '')
      .split(path.sep)
      .join('/');
    const replacementSpecifier = relativePath.startsWith('.')
      ? relativePath
      : `./${relativePath}`;

    for (const quote of [`'`, `"`]) {
      rewrittenFileContents = rewrittenFileContents
        .split(`${quote}${specifier}${quote}`)
        .join(`${quote}${replacementSpecifier}${quote}`);
    }
  }

  return rewrittenFileContents;
}

async function prependVendoredPackageHeader({outputDir, packageName, version}) {
  const packageRootIndexPath = path.join(outputDir, 'index.ts');
  const packageRootIndexContents = await fs.readFile(packageRootIndexPath, 'utf8');
  const generatedHeader = [
    `// Generated from ${packageName}@${version}.`,
    `// Do not edit manually; update via ./scripts/vendor-program-clients.mjs.`,
    '',
  ].join('\n');

  await fs.writeFile(
    packageRootIndexPath,
    packageRootIndexContents.startsWith(generatedHeader)
      ? packageRootIndexContents
      : `${generatedHeader}${packageRootIndexContents}`,
  );
}

async function synthesizeBarrelFiles(rootDir) {
  const childEntries = await fs.readdir(rootDir, {withFileTypes: true});

  await Promise.all(
    childEntries
      .filter(entry => entry.isDirectory())
      .map(entry => synthesizeBarrelFiles(path.join(rootDir, entry.name))),
  );

  const exportSpecifiers = childEntries
    .filter(entry => entry.isDirectory() || entry.name.endsWith('.ts'))
    .map(entry => entry.name)
    .filter(name => name !== 'index.ts')
    .map(name => name.replace(/\.ts$/, ''))
    .sort((left, right) => left.localeCompare(right));

  const indexPath = path.join(rootDir, 'index.ts');
  try {
    await fs.access(indexPath);
    return;
  } catch {
    // Fall through and synthesize the missing barrel file.
  }

  await fs.writeFile(
    indexPath,
    exportSpecifiers.map(specifier => `export * from './${specifier}';`).join('\n') +
      '\n',
  );
}

async function writeExplicitKitShimIndex() {
  const exportMap = await collectKitShimExports();
  const packageNames = [...exportMap.keys()].sort((left, right) =>
    left.localeCompare(right),
  );

  const fileSections = [
    '// Internal compatibility shim for vendored program clients.',
    '// Do not edit manually; update via ./scripts/vendor-program-clients.mjs.',
    '',
  ];

  for (const packageName of packageNames) {
    const {typeExports, valueExports} = exportMap.get(packageName);
    if (valueExports.size > 0) {
      fileSections.push(
        `export {${[...valueExports]
          .sort((left, right) => left.localeCompare(right))
          .join(', ')}} from '${packageName}';`,
      );
    }
    if (typeExports.size > 0) {
      fileSections.push(
        `export type {${[...typeExports]
          .sort((left, right) => left.localeCompare(right))
          .join(', ')}} from '${packageName}';`,
      );
    }
    fileSections.push('');
  }

  await fs.writeFile(kitShimIndexPath, fileSections.join('\n'));
}

async function collectKitShimExports() {
  const tsConfigPath = ts.findConfigFile(
    workspaceRoot,
    ts.sys.fileExists,
    'tsconfig.json',
  );
  if (!tsConfigPath) {
    throw new Error('Unable to locate tsconfig.json for vendored shim generation.');
  }

  const tsConfigFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
  if (tsConfigFile.error) {
    throw new Error(
      ts.flattenDiagnosticMessageText(tsConfigFile.error.messageText, '\n'),
    );
  }

  const parsedTsConfig = ts.parseJsonConfigFileContent(
    tsConfigFile.config,
    ts.sys,
    workspaceRoot,
  );
  const program = ts.createProgram({
    rootNames: parsedTsConfig.fileNames,
    options: parsedTsConfig.options,
  });
  const checker = program.getTypeChecker();
  const exportMap = new Map();

  async function getTypeScriptFilePaths(rootDir) {
    const childEntries = await fs.readdir(rootDir, {withFileTypes: true});
    const nestedFilePaths = await Promise.all(
      childEntries
        .filter(entry => entry.isDirectory())
        .map(entry => getTypeScriptFilePaths(path.join(rootDir, entry.name))),
    );

    return [
      ...childEntries
        .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
        .map(entry => path.join(rootDir, entry.name)),
      ...nestedFilePaths.flat(),
    ];
  }

  function inferNodeModulePackageName(symbol) {
    const packageNames = new Set(
      (symbol.declarations ?? [])
        .map(declaration => declaration.getSourceFile().fileName)
        .map(fileName => {
          const normalizedPath = fileName.split(path.sep).join('/');
          const nodeModulesMarker = '/node_modules/';
          const markerIndex = normalizedPath.lastIndexOf(nodeModulesMarker);
          if (markerIndex === -1) {
            return null;
          }

          const pathWithinNodeModules = normalizedPath.slice(
            markerIndex + nodeModulesMarker.length,
          );
          const pathSegments = pathWithinNodeModules.split('/');
          return pathSegments[0].startsWith('@')
            ? `${pathSegments[0]}/${pathSegments[1]}`
            : pathSegments[0];
        })
        .filter(Boolean),
    );

    if (packageNames.size === 1) {
      return packageNames.values().next().value;
    }

    if (packageNames.size > 1) {
      throw new Error(
        `Ambiguous shim export owner for ${symbol.name}: ${[...packageNames].join(', ')}`,
      );
    }

    return null;
  }

  const sourceFilePaths = await getTypeScriptFilePaths(generatedRoot);

  for (const sourceFilePath of sourceFilePaths) {
    const sourceFile = program.getSourceFile(sourceFilePath);
    if (!sourceFile) {
      continue;
    }

    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement)) {
        continue;
      }
      if (
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        !statement.moduleSpecifier.text.endsWith('kit-shims/index')
      ) {
        continue;
      }

      const importClause = statement.importClause;
      if (
        !importClause ||
        !importClause.namedBindings ||
        !ts.isNamedImports(importClause.namedBindings)
      ) {
        continue;
      }

      for (const importElement of importClause.namedBindings.elements) {
        let symbol = checker.getSymbolAtLocation(importElement.name);
        if (!symbol) {
          continue;
        }
        if (symbol.flags & ts.SymbolFlags.Alias) {
          symbol = checker.getAliasedSymbol(symbol);
        }

        const packageName =
          KIT_SHIM_PACKAGE_OVERRIDES[
            importElement.propertyName?.text ?? importElement.name.text
          ] ?? inferNodeModulePackageName(symbol);
        if (!packageName) {
          throw new Error(
            `Unable to infer shim export package for ${importElement.name.text} from ${sourceFilePath}.`,
          );
        }

        const packageExports =
          exportMap.get(packageName) ??
          {
            typeExports: new Set(),
            valueExports: new Set(),
          };

        if (symbol.flags & ts.SymbolFlags.Value) {
          packageExports.valueExports.add(
            importElement.propertyName?.text ?? importElement.name.text,
          );
        } else {
          packageExports.typeExports.add(
            importElement.propertyName?.text ?? importElement.name.text,
          );
        }

        exportMap.set(packageName, packageExports);
      }
    }
  }

  return exportMap;
}

async function findNearestPackageJson(resolvedEntryPath) {
  let currentDir = path.dirname(resolvedEntryPath);

  while (true) {
    const candidatePath = path.join(currentDir, 'package.json');
    try {
      await fs.access(candidatePath);
      return candidatePath;
    } catch {
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        throw new Error(
          `Unable to locate package.json for resolved entry ${resolvedEntryPath}`,
        );
      }
      currentDir = parentDir;
    }
  }
}

await main();