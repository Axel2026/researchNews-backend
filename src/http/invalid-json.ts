export function isInvalidJson(error: unknown): error is SyntaxError {
  return (
    error instanceof SyntaxError &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  );
}
