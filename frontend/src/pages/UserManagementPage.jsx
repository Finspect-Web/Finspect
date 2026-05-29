import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  UserPlus,
  Pencil,
  KeyRound,
  Ban,
  CheckCircle,
  Loader2,
  Search,
  Trash2,
  AlertTriangle,
  X
} from "lucide-react";
import PageTransition from "../components/PageTransition";
import {
  getUsers,
  createUser,
  updateUser,
  resetPassword,
  deactivateUser,
  activateUser,
  deleteUser
} from "../api/userApi";
import { useAuth } from "../hooks/useAuth";

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "STAFF"
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();

  // Users list
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const [form, setForm] = useState(emptyUserForm);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "STAFF" });
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  // Feedback
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setUsers(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  // Create user
  const handleCreateUser = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setSubmitting(true);
    try {
      const res = await createUser(form);
      setSuccessMessage(res.message || "User created successfully.");
      setForm(emptyUserForm);
      setShowCreateModal(false);
      await loadUsers();
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role });
    setShowEditModal(true);
    setError("");
    setSuccessMessage("");
  };

  // Edit user
  const handleEditUser = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setSubmitting(true);
    try {
      const res = await updateUser(selectedUser.id, editForm);
      setSuccessMessage(res.message || "User updated successfully.");
      setShowEditModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (editError) {
      setError(editError.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Open reset password modal
  const openResetPasswordModal = (user) => {
    setSelectedUser(user);
    setResetPasswordValue("");
    setShowResetPasswordModal(true);
    setError("");
    setSuccessMessage("");
  };

  // Reset password
  const handleResetPassword = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setSubmitting(true);
    try {
      const res = await resetPassword(selectedUser.id, resetPasswordValue);
      setSuccessMessage(res.message || "Password reset successfully.");
      setShowResetPasswordModal(false);
      setSelectedUser(null);
    } catch (resetError) {
      setError(resetError.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
    setError("");
    setSuccessMessage("");
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setError("");
    setSuccessMessage("");
    setDeleting(true);
    try {
      const res = await deleteUser(userToDelete.id);
      setSuccessMessage(res.message || `${userToDelete.name} has been deleted.`);
      setShowDeleteModal(false);
      setUserToDelete(null);
      await loadUsers();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeleting(false);
    }
  };

  // Deactivate / Activate
  const handleToggleActive = async (user) => {
    setError("");
    setSuccessMessage("");
    try {
      if (user.isActive) {
        await deactivateUser(user.id);
        setSuccessMessage(`${user.name} has been deactivated.`);
      } else {
        await activateUser(user.id);
        setSuccessMessage(`${user.name} has been activated.`);
      }
      await loadUsers();
    } catch (toggleError) {
      setError(toggleError.message);
    }
  };

  // Get creator name
  const getCreatedByName = (user) => {
    if (!user.createdBy) return "—";
    return user.createdBy.name;
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  if (currentUser.role !== "ADMIN") {
    return (
      <PageTransition className="space-y-5">
        <h1 className="text-xl font-black">User Management</h1>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft dark:border-slate-700 dark:bg-slate-900">
          <p className="text-slate-500">You do not have permission to access this page.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage staff accounts — only admins can create and manage users.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setForm(emptyUserForm);
            setShowCreateModal(true);
            setError("");
            setSuccessMessage("");
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 active:scale-[0.98] transition"
        >
          <UserPlus size={16} />
          Create Staff
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
          {successMessage}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search users by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-slate-700 dark:bg-slate-900"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            {searchQuery ? "No users match your search." : "No users found. Create your first staff member."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Created By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Created Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {u.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                      {u.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.role === "ADMIN"
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            u.isActive ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {u.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                      {getCreatedByName(u)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(u)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                          title="Edit user"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openResetPasswordModal(u)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-800 dark:hover:text-amber-400"
                          title="Reset password"
                        >
                          <KeyRound size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === currentUser.id}
                          className={`rounded-lg p-1.5 transition ${
                            u.id === currentUser.id
                              ? "cursor-not-allowed text-slate-300"
                              : u.isActive
                                ? "text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                                : "text-slate-400 hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                          }`}
                          title={
                            u.id === currentUser.id
                              ? "Cannot modify your own status"
                              : u.isActive
                                ? "Deactivate user"
                                : "Activate user"
                          }
                        >
                          {u.isActive ? <Ban size={15} /> : <CheckCircle size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteModal(u)}
                          disabled={u.id === currentUser.id}
                          className={`rounded-lg p-1.5 transition ${
                            u.id === currentUser.id
                              ? "cursor-not-allowed text-slate-300"
                              : "text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          }`}
                          title={
                            u.id === currentUser.id
                              ? "Cannot delete your own account"
                              : "Delete user"
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ========== CREATE USER MODAL ========== */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold">Create Staff Account</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a new staff account. They will use these credentials to log in.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleCreateUser}>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="e.g. Jane Doe"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="jane@example.com"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Temporary Password</span>
                <input
                  required
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="Min. 6 characters"
                  minLength={6}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Role</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-70"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Create Account
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ========== DELETE USER CONFIRMATION MODAL ========== */}
      {showDeleteModal && userToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Delete User</h2>
                <p className="text-sm text-slate-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Are you sure you want to delete <strong>{userToDelete.name}</strong>?
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Email: {userToDelete.email} &middot; Role: {userToDelete.role}
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ========== EDIT USER MODAL ========== */}
      {showEditModal && selectedUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold">Edit User</h2>
            <p className="mt-1 text-sm text-slate-500">
              Update details for {selectedUser.name}.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleEditUser}>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Name</span>
                <input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</span>
                <input
                  required
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">Role</span>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-70"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* ========== RESET PASSWORD MODAL ========== */}
      {showResetPasswordModal && selectedUser && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => { setShowResetPasswordModal(false); setSelectedUser(null); }}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold">Reset Password</h2>
            <p className="mt-1 text-sm text-slate-500">
              Set a new password for <strong>{selectedUser.name}</strong>.
            </p>

            <form className="mt-5 space-y-4" onSubmit={handleResetPassword}>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">New Password</span>
                <input
                  required
                  type="text"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                  placeholder="Enter new password (min. 6 characters)"
                  minLength={6}
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowResetPasswordModal(false); setSelectedUser(null); }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-70"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Reset Password
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </PageTransition>
  );
}
