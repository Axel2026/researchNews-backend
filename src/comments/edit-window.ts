export const COMMENT_EDIT_WINDOW_MS = 60 * 60 * 1000;

export function isWithinEditWindow(createdAt: Date, now = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < COMMENT_EDIT_WINDOW_MS;
}
