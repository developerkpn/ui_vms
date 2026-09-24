import { useCallback, useEffect, useState } from "react";

import {
  isFolderCollapsed,
  parseCollapsedFolders,
  serializeCollapsedFolders,
  toggleCollapsedFolder,
} from "src/helper/collapsedFolders";

/**
 * Remembers which guide folders this viewer has collapsed.
 *
 * localStorage rather than the user-preference endpoint: this is a per-device
 * display convenience, not something worth a row in the database or a round trip
 * on every click. Every access is guarded because storage throws outright in a
 * browser set to block site data, and a page that cannot remember a collapsed
 * folder must still open.
 */
export default function useCollapsedFolders(storageKey) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return parseCollapsedFolders(window.localStorage.getItem(storageKey));
    } catch (error) {
      return new Set();
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, serializeCollapsedFolders(collapsed));
    } catch (error) {
      // Nothing to do: the folders simply open again next visit.
    }
  }, [storageKey, collapsed]);

  const toggleFolder = useCallback(folderId => {
    setCollapsed(previous => toggleCollapsedFolder(previous, folderId));
  }, []);

  const isCollapsed = useCallback(
    folderId => isFolderCollapsed(collapsed, folderId),
    [collapsed]
  );

  return { isCollapsed, toggleFolder, setCollapsed };
}
