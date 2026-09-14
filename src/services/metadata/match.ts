export function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/\((windows|win64|64-bit|32-bit)\)/g, "")
    .replace(/:\s+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function titlesLikelyMatch(query: string, candidate: string): boolean {
  const left = normalizeTitle(query);
  const right = normalizeTitle(candidate);
  if (!left || !right) {
    return false;
  }
  if (left === right || left.includes(right) || right.includes(left)) {
    return true;
  }

  const leftTokens = new Set(left.split(" ").filter((token) => token.length > 2));
  const rightTokens = right.split(" ").filter((token) => token.length > 2);
  if (leftTokens.size === 0 || rightTokens.length === 0) {
    return false;
  }

  const overlap = rightTokens.filter((token) => leftTokens.has(token)).length;
  return overlap / Math.max(leftTokens.size, rightTokens.length) >= 0.5;
}
