import { Eye, EyeOff, UserPlus, LogIn } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const ROLES = [
  { value: "STAFF", label: "Staff", description: "Manage clients, tasks & day-to-day operations" },
  { value: "ADMIN", label: "Admin", description: "Full access including user management & settings" }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignUp = mode === "signup";

  const onSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role
        });
      } else {
        await login({ email: form.email, password: form.password });
      }
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setError("");
  };

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6 dark:bg-slate-950">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-soft dark:bg-slate-900 lg:min-h-[35rem] lg:grid-cols-2">
        {/* Brand Panel */}
        <section className="flex flex-col justify-center bg-brand-900 px-8 py-10 text-white sm:px-10">
          <p className="text-2xl font-extrabold">Finspect</p>
          <h1 className="mt-10 text-3xl font-extrabold leading-tight">
            {isSignUp ? "Join the platform" : "Manage your practice smarter and faster"}
          </h1>
          <p className="mt-6 text-sm text-brand-100">
            {isSignUp
              ? "Create your account and start managing clients, tasks, credentials, and team productivity."
              : "Enterprise-grade practice management for clients, tasks, credentials, and team productivity."}
          </p>
        </section>

        {/* Form Panel */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-8 lg:px-10">
          <div className="w-full max-w-sm">
            <h2 className="text-3xl font-extrabold">{isSignUp ? "Create Account" : "Sign In"}</h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {isSignUp ? "Fill in your details to get started." : "Access your dashboard securely."}
            </p>

            <form className="mt-7 space-y-4" onSubmit={onSubmit}>
              {/* Name field — sign up only */}
              {isSignUp && (
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold">Full Name</span>
                  <input
                    required
                    type="text"
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-2.5"
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </label>
              )}

              <label className="block">
                <span className="mb-1 block text-xs font-semibold">Email</span>
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  className="w-full px-4 py-2.5"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold">Password</span>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;&#9679;"
                    className="w-full px-4 py-2.5 pr-12"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>

              {/* Role selection — sign up only */}
              {isSignUp && (
                <fieldset>
                  <span className="mb-2 block text-xs font-semibold">I want to join as</span>
                  <div className="space-y-2">
                    {ROLES.map((role) => (
                      <label
                        key={role.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                          form.role === role.value
                            ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/30 dark:border-brand-500 dark:bg-brand-900/30"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name="role"
                          value={role.value}
                          checked={form.role === role.value}
                          onChange={(e) => updateField("role", e.target.value)}
                          className="h-4 w-4 accent-brand-500"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{role.label}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{role.description}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {error ? (
                <p className="text-xs font-medium text-rose-600">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  isSignUp ? "Creating account..." : "Signing in..."
                ) : isSignUp ? (
                  <>
                    <UserPlus size={16} />
                    Create Account
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Toggle between Sign In and Sign Up */}
            <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={toggleMode}
                className="font-semibold text-brand-500 hover:text-brand-700 underline transition"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
