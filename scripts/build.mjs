import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { build as viteBuild, loadConfigFromFile, mergeConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function formatDiagnostics(diagnostics, host) {
  return ts.formatDiagnosticsWithColorAndContext(diagnostics, host);
}

function createFormatHost() {
  return {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => repoRoot,
    getNewLine: () => ts.sys.newLine,
  };
}

function loadTypeScriptConfig() {
  const configPath = ts.findConfigFile(repoRoot, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('Could not find tsconfig.json for Neon District.');
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(formatDiagnostics([configFile.error], createFormatHost()));
  }

  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  if (parsed.errors.length > 0) {
    throw new Error(formatDiagnostics(parsed.errors, createFormatHost()));
  }

  return parsed;
}

function runTypeCheck() {
  const parsed = loadTypeScriptConfig();
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
    projectReferences: parsed.projectReferences,
  });

  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) {
    process.stderr.write(formatDiagnostics(diagnostics, createFormatHost()));
    return false;
  }

  process.stdout.write('TypeScript check passed.\n');
  return true;
}

async function runViteBuild() {
  const loadedConfig = await loadConfigFromFile(
    { command: 'build', mode: process.env.NODE_ENV ?? 'production' },
    path.join(repoRoot, 'vite.config.ts'),
    repoRoot,
  );

  const inlineConfig = mergeConfig(loadedConfig?.config ?? {}, {
    configFile: false,
    root: repoRoot,
    base: './',
    mode: process.env.NODE_ENV ?? 'production',
  });

  await viteBuild(inlineConfig);
  process.stdout.write('Vite build passed.\n');
}

async function main() {
  if (!runTypeCheck()) {
    process.exitCode = 1;
    return;
  }

  await runViteBuild();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
