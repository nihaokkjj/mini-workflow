export function nextAppDatasetRequestVersion(currentVersion: number): number {
  return currentVersion + 1;
}

export function shouldApplyAppDatasetResponse(
  activeVersion: number,
  responseVersion: number
): boolean {
  return activeVersion === responseVersion;
}
