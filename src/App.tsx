// Copyright (c) 2026 Skuld, LLC. All rights reserved.
// Proprietary and confidential. Reverse engineering prohibited.

import { useEffect } from "react";
import AppLayout from "./components/AppLayout";
import { useProjectStore } from "./store/projectStore";
import { useNavigationStore } from "./store/navigationStore";

function App() {
  const { loadRecentProjects } = useProjectStore();
  const { setView } = useNavigationStore();

  // Initialize app
  useEffect(() => {
    loadRecentProjects();
    setView("welcome");
  }, [loadRecentProjects, setView]);

  return <AppLayout />;
}

export default App;
