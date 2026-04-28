import { Bell, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";

export default function Topbar({ notificationCount }) {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("finspect_theme") === "dark");

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("finspect_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("finspect_theme", "light");
    }
  }, [darkMode]);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-slate-50 px-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Finspect / Dashboard</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Overview and metrics</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setDarkMode((prev) => !prev)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title="Toggle dark mode"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className="relative rounded-lg p-1.5 text-slate-500 dark:text-slate-300">
          <Bell size={16} />
          {notificationCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1.5 text-center text-[10px] font-bold text-white">
              {notificationCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-700 dark:bg-slate-800">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{user.role}</span>
        </div>
      </div>
    </header>
  );
}
