import {
  BadgeIndianRupee,
  Calendar,
  BriefcaseBusiness,
  ClipboardCheck,
  CalendarCheck2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SquareKanban,
  Table2,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: BriefcaseBusiness },
  { to: "/tasks", label: "Tasks", icon: SquareKanban },
  { to: "/task-stages", label: "Task Stages", icon: Table2, role: "ADMIN" },
  { to: "/compliance", label: "Compliance", icon: CalendarCheck2 },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/timesheets", label: "Timesheets", icon: Users },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/billing", label: "Billing", icon: BadgeIndianRupee },
  { to: "/credentials", label: "Credentials", icon: KeyRound, role: "ADMIN" },
  { to: "/reports", label: "Reports", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ isOpen, onToggle }) {
  const { user, logout } = useAuth();

  const items = navItems.filter((item) => !item.role || item.role === user.role);

  return (
    <aside
      className={`flex h-full flex-col border-r border-slate-200 bg-slate-50 px-3 py-5 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      <div className={`mb-6 ${isOpen ? "px-3" : "px-0"}`}>
        <div className={`flex ${isOpen ? "items-start justify-between" : "flex-col items-center gap-2"}`}>
          <div className={isOpen ? "" : "text-center"}>
            <p className="text-xl font-extrabold tracking-tight text-brand-700">{isOpen ? "Finspect" : "F"}</p>
            {isOpen ? <p className="text-xs text-slate-500 dark:text-slate-400">Practice Management Suite</p> : null}
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            title={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center rounded-xl py-2.5 text-[13px] font-medium transition ${
                  isOpen ? "gap-3 px-3" : "justify-center px-2"
                } ${
                  isActive
                    ? "border border-brand-100 bg-brand-50 text-brand-900 dark:border-brand-700/40 dark:bg-brand-900/30 dark:text-brand-100"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`
              }
              title={item.label}
            >
              <Icon size={16} />
              {isOpen ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={logout}
        className={`mt-4 flex items-center rounded-xl border border-slate-200 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 ${
          isOpen ? "gap-2 px-3" : "justify-center px-2"
        }`}
        title="Logout"
      >
        <LogOut size={16} />
        {isOpen ? "Logout" : null}
      </button>
    </aside>
  );
}
