import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
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

const GENERATED_SOURCE_ROOT_NAME = 'generated';

const IMPORT_REWRITES = Object.freeze([
  [
    '@solana/kit/program-client-core',
    path.join(kitShimsRoot, 'program-client-core.ts'),
  ],
  ['@solana/kit', path.join(kitShimsRoot, 'index.ts')],
]);

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

  await fs.mkdir(generatedRoot, {recursive: true});

  for (const entry of manifest) {
    await vendorProgramClient(entry);
  }
}

async function vendorProgramClient({
  outputName,
  packageName,
  runtimeEntry,
}) {
  const packageJsonPath = await findNearestPackageJson(
    require.resolve(packageName),
  );
  const packageRoot = path.dirname(packageJsonPath);
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  const runtimeEntryPath = path.join(packageRoot, runtimeEntry);
  const sourceMapPath = `${runtimeEntryPath}.map`;
  const sourceMap = JSON.parse(await fs.readFile(sourceMapPath, 'utf8'));
  const outputDir = path.join(generatedRoot, outputName);

  await fs.rm(outputDir, {recursive: true, force: true});
  await fs.mkdir(outputDir, {recursive: true});

  await writeGeneratedSourcesFromMap({
    outputDir,
    packageName,
    packageRoot,
    packageVersion: packageJson.version,
    runtimeEntryPath,
    sourceMap,
  });
  await synthesizeBarrelFiles(outputDir);

  await fs.writeFile(
    path.join(outputDir, 'index.ts'),
    [
      `// Generated from ${packageName}@${packageJson.version}.`,
      `// Do not edit manually; update via ./scripts/vendor-program-clients.mjs.`,
      `export * from './${GENERATED_SOURCE_ROOT_NAME}';`,
      '',
    ].join('\n'),
  );
}

async function writeGeneratedSourcesFromMap({
  outputDir,
  packageName,
  packageRoot,
  packageVersion,
  runtimeEntryPath,
  sourceMap,
}) {
  const packageSourceRoot = path.join(packageRoot, 'src');
  if (
    !Array.isArray(sourceMap.sources) ||
    !Array.isArray(sourceMap.sourcesContent) ||
    sourceMap.sources.length !== sourceMap.sourcesContent.length
  ) {
    throw new Error(
      `Expected ${packageName}@${packageVersion} source map to include matched sources and sourcesContent arrays.`,
    );
  }

  await Promise.all(
    sourceMap.sources.map(async (sourceRelativePath, index) => {
      const sourceContent = sourceMap.sourcesContent[index];
      if (typeof sourceContent !== 'string') {
        throw new Error(
          `Expected ${packageName}@${packageVersion} source map to embed source content for ${sourceRelativePath}.`,
        );
      }

      const absoluteSourcePath = path.resolve(
        path.dirname(runtimeEntryPath),
        sourceRelativePath,
      );
      const outputPath = path.join(
        outputDir,
        getGeneratedSourceSubpath(packageSourceRoot, absoluteSourcePath),
      );
      await fs.mkdir(path.dirname(outputPath), {recursive: true});
      await fs.writeFile(
        outputPath,
        rewriteImportsForGeneratedSource(outputPath, sourceContent),
      );
    }),
  );
}

function getGeneratedSourceSubpath(packageSourceRoot, absoluteSourcePath) {
  if (absoluteSourcePath.startsWith(`${packageSourceRoot}${path.sep}`)) {
    const relativeSourcePath = path.relative(packageSourceRoot, absoluteSourcePath);
    return relativeSourcePath.startsWith(`generated${path.sep}`)
      ? relativeSourcePath
      : relativeSourcePath;
  }

  throw new Error(
    `Expected vendored source ${absoluteSourcePath} to live under ${packageSourceRoot}.`,
  );
}

function rewriteImportsForGeneratedSource(outputPath, sourceContent) {
  let fileContents = sourceContent;

  for (const [specifier, shimPath] of IMPORT_REWRITES) {
    if (!fileContents.includes(specifier)) {
      continue;
    }

    const replacementSpecifier = toPosixRelativeSpecifier(
      stripTsExtension(path.relative(path.dirname(outputPath), shimPath)),
    );
    for (const quote of [`'`, `"`]) {
      fileContents = fileContents
        .split(`${quote}${specifier}${quote}`)
        .join(`${quote}${replacementSpecifier}${quote}`);
    }
  }

  return fileContents;
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
    .map(name => stripTsExtension(name))
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

function stripTsExtension(fileName) {
  return fileName.replace(/\.ts$/, '');
}

function toPosixRelativeSpecifier(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
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