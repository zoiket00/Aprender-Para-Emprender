const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Observar toda la raíz del monorepo (necesario para @ape/shared)
config.watchFolders = [monorepoRoot];

// Resolver node_modules desde el package y desde la raíz del monorepo
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Habilitar symlinks de pnpm
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
