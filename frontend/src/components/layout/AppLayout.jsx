import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import MasterSearch from "../MasterSearch";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getDashboardSummary } from "../../api/dashboardApi";

export default function AppLayout() {
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    let mounted = true;
    getDashboardSummary()
      .then((data) => {
        if (mounted) {
          setNotificationCount(data.stats.notificationCount || 0);
        }
      })
      .catch(() => {
        if (mounted) {
          setNotificationCount(0);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex h-full">
        <Sidebar isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen((prev) => !prev)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar notificationCount={notificationCount} onOpenSearch={() => setIsSearchOpen(true)} />
          <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
      <MasterSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
}
