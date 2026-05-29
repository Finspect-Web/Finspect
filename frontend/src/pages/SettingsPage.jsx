import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { motion } from "framer-motion";
import PageTransition from "../components/PageTransition";
import { useAuth } from "../hooks/useAuth";

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <PageTransition className="space-y-5">
      <h1 className="text-xl font-black">Settings</h1>

      {/* Profile Section */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
      >
        <h2 className="text-xl font-bold">Profile</h2>
        <div className="mt-3 space-y-1 text-sm">
          <p>
            <span className="font-semibold">Name:</span> {user.name}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-semibold">Role:</span> {user.role}
          </p>
        </div>
      </motion.section>

      {/* Admin: User Management link */}
      {user.role === "ADMIN" && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">User Management</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Create, edit, and manage staff accounts. Control passwords and account status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/settings/users")}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 active:scale-[0.98] transition"
            >
              <Users size={16} />
              Manage Users
            </button>
          </div>
        </motion.section>
      )}

    </PageTransition>
  );
}
