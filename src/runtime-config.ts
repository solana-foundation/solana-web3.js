export function getRuntimeVersion(): string | undefined {
  if (typeof __VERSION__ !== 'undefined' && __VERSION__.length > 0) {
    return __VERSION__;
  }

  const nodeRuntimeVersion =
    typeof process !== 'undefined'
      ? process.env?.npm_package_version
      : undefined;
  return nodeRuntimeVersion != null && nodeRuntimeVersion.length > 0
    ? nodeRuntimeVersion
    : undefined;
}
