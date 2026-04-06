export const ENABLE_FILE_WATCHER_WORKAROUND =
  process.env.ENABLE_FILE_WATCHER_WORKAROUND === "true";

export function shouldUseFileWatcherWorkaround(): boolean {
  return ENABLE_FILE_WATCHER_WORKAROUND;
}
