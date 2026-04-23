// Copyright (c) 2026 Skuld, LLC. All rights reserved.
// Proprietary and confidential. Reverse engineering prohibited.

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================
// UI Preferences Store
// Persists per-user display preferences for the Studio canvas
// and other UI surfaces. Settings here are non-destructive and
// do NOT affect the compiled bot or its execution.
// ============================================================

interface UiPreferencesState {
  // Canvas — show technical type labels under each node (e.g. "files.list").
  // Default false: keeps the canvas clean for business users and marketing
  // screenshots. Enable for debugging or when multiple nodes share the same
  // label and you need the type to disambiguate.
  showTypeLabels: boolean;
  setShowTypeLabels: (value: boolean) => void;
}

export const useUiPreferencesStore = create<UiPreferencesState>()(
  persist(
    (set) => ({
      showTypeLabels: false,
      setShowTypeLabels: (value) => set({ showTypeLabels: value }),
    }),
    {
      name: "skuldbot-ui-preferences",
    },
  ),
);
