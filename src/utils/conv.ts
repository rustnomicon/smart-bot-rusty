export function bytesToMb(bytes: number): string {
  const outputSizeMb = bytes / (1024 * 1024);
  return `${outputSizeMb.toFixed(2)} MB (${bytes} bytes)`;
}
