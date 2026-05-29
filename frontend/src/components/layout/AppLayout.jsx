import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getDashboardSummary } from "../../api/dashboardApi";

export default function AppLayout() {
  const location = useLocation();
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
          <Topbar notificationCount={notificationCount} />
          <main className="scrollbar-thin flex-1 overflow-y-auto p-6">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
      </div>
    </div>
  );
}
