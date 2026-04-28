import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(form);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 dark:bg-slate-950">
      <div className="grid w-full max-w-7xl overflow-hidden rounded-2xl bg-white shadow-soft dark:bg-slate-900 lg:grid-cols-2">
        <section className="flex flex-col justify-center bg-brand-900 px-10 py-14 text-white">
          <p className="text-2xl font-extrabold">Finspect</p>
          <h1 className="mt-10 text-3xl font-extrabold leading-tight">Manage your practice smarter and faster</h1>
          <p className="mt-6 text-sm text-brand-100">
            Enterprise-grade practice management for clients, tasks, credentials, and team productivity.
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-14 sm:px-10">
          <div className="w-full max-w-2xl">
            <h2 className="text-3xl font-extrabold">Sign In</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Access your dashboard securely.</p>

            <form className="mt-8 space-y-4" onSubmit={onSubmit}>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold">Email</span>
                <input
                  required
                  type="email"
                  className="w-full px-4 py-2.5"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold">Password</span>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-2.5 pr-12"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
