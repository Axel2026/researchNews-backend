export function queryParam(
  query: Record<string, unknown>,
  name: string,
): string | undefined {
  const value = query[name];
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return undefined;
}
