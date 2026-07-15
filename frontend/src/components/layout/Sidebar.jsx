import { AnimatePresence, motion } from "framer-motion";
import logo from "../../assets/logo.png";
import {
  BadgeIndianRupee,
  Calendar,
  BriefcaseBusiness,
  ClipboardCheck,
  CalendarCheck2,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  SquareKanban,
  Users
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Clients", icon: BriefcaseBusiness },
  { to: "/tasks", label: "Tasks", icon: SquareKanban },
  { to: "/compliance", label: "Compliance", icon: CalendarCheck2 },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { to: "/timesheets", label: "Timesheets", icon: Users },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/billing", label: "Billing", icon: BadgeIndianRupee },
  { to: "/reports", label: "Reports", icon: Users },
  { to: "/settings/users", label: "Users", icon: Users, role: "ADMIN" },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Sidebar({ isOpen, onToggle }) {
  const { user, logout } = useAuth();

  const items = navItems.filter((item) => !item.role || item.role === user.role);

  return (
    <motion.aside
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex h-full flex-col border-r border-slate-200 bg-slate-50 px-3 py-5 transition-all duration-200 dark:border-slate-800 dark:bg-slate-900 ${
        isOpen ? "w-64" : "w-20"
      }`}
    >
      <div className={`mb-6 ${isOpen ? "px-3" : "px-0"}`}>
        <div className={`flex ${isOpen ? "items-start justify-between" : "flex-col items-center gap-2"}`}>
          <div className={isOpen ? "" : "text-center"}>
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.p
                  key="brand-text"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-xl font-extrabold tracking-tight text-brand-700"
                >
                  Finspect
                </motion.p>
              ) : (
                <motion.img
                  key="brand-logo"
                  src={logo}
                  alt="Finspect"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="h-9 w-9 rounded-lg object-contain"
                />
              )}
            </AnimatePresence>
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.p
                  key="subtitle"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, delay: 0.05 }}
                  className="text-xs text-slate-500 dark:text-slate-400"
                >
                  Practice Management Suite
                </motion.p>
              ) : null}
            </AnimatePresence>
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

      <motion.nav
        className="flex-1 space-y-1"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } }
        }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.to}
              variants={{
                hidden: { opacity: 0, x: -12 },
                show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } }
              }}
            >
            <NavLink
              to={item.to}
              end={item.to === "/settings"}
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
            </motion.div>
          );
        })}
      </motion.nav>

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
    </motion.aside>
  );
}
