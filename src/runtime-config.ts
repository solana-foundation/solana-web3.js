export function getRuntimeVersion(): string | undefined {
  const bundledVersion =
    typeof __VERSION__ !== 'undefined' ? __VERSION__ : undefined;
  if (bundledVersion && bundledVersion.length > 0) {
    return bundledVersion;
  }

  const nodeRuntimeVersion =
    typeof process !== 'undefined'
      ? process.env?.npm_package_version
      : undefined;
  return nodeRuntimeVersion != null && nodeRuntimeVersion.length > 0
    ? nodeRuntimeVersion
    : undefined;
}
