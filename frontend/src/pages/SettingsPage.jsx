import { useCallback, useEffect, useState } from "react";
import { registerUser } from "../api/authApi";
import { getUsers } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";

const emptyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "STAFF"
};

export default function SettingsPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyUserForm);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadUsers = useCallback(async () => {
    if (user.role !== "ADMIN") return;
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [user.role]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onCreateUser = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    try {
      await registerUser(form);
      setSuccessMessage("User created successfully.");
      setForm(emptyUserForm);
      await loadUsers();
    } catch (createError) {
      setError(createError.message);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-black">Settings</h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
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
      </section>

      {user.role === "ADMIN" ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-bold">Manage Staff</h2>
            <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreateUser}>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Email</span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Password</span>
                <input
                  required
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label>
                <span className="mb-1 block text-sm font-semibold text-slate-600">Role</span>
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="STAFF">STAFF</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <button type="submit" className="rounded-xl bg-brand-900 px-4 py-2 text-sm font-semibold text-white">
                  Create User
                </button>
              </div>
            </form>
            {error ? <p className="mt-2 text-sm font-semibold text-rose-600">{error}</p> : null}
            {successMessage ? <p className="mt-2 text-sm font-semibold text-emerald-600">{successMessage}</p> : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-xl font-bold">Users</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-2 py-2 text-left">Name</th>
                    <th className="px-2 py-2 text-left">Email</th>
                    <th className="px-2 py-2 text-left">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((member) => (
                    <tr key={member.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-2 py-2">{member.name}</td>
                      <td className="px-2 py-2">{member.email}</td>
                      <td className="px-2 py-2">{member.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Staff users can view profile settings here. User management is admin-only.
        </p>
      )}
    </div>
  );
}
