import { Eye, EyeOff, UserPlus, LogIn, Sparkles, Building2, Shield, Users } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ParticlesBackground from "../components/ParticlesBackground";
import Loader from "../components/Loader";

const ROLES = [
  { value: "STAFF", label: "Staff", description: "Manage clients, tasks & day-to-day operations" },
  { value: "ADMIN", label: "Admin", description: "Full access including user management & settings" }
];

const TAGLINES = [
  "Enterprise-grade practice management",
  "Streamline your financial operations",
  "Manage clients, tasks & credentials",
  "Boost team productivity",
];

const FEATURES = [
  { icon: Building2, text: "Client & Task Management" },
  { icon: Shield, text: "Compliance & Credentials" },
  { icon: Users, text: "Team Collaboration" },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("signin");
  const [showAuthLoader, setShowAuthLoader] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taglineIdx, setTaglineIdx] = useState(0);

  const isSignUp = mode === "signup";

  useEffect(() => {
    // Cycle taglines
    const interval = setInterval(() => {
      setTaglineIdx((prev) => (prev + 1) % TAGLINES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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

      // Show loader for ~2s, then navigate to dashboard
      setShowAuthLoader(true);
    } catch (submitError) {
      setError(submitError.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === "signin" ? "signup" : "signin"));
    setError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to dashboard when the Loader animation completes
  const handleLoaderComplete = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Premium loading screen — auto-dismisses via setTimeout above */}
      {showAuthLoader && (
        <Loader
          isSignUp={isSignUp}
          userName={isSignUp ? form.name : ""}
          duration={1600}
          onComplete={handleLoaderComplete}
        />
      )}

      <div className="flex h-screen w-screen overflow-hidden bg-slate-950">
      {/* ========== LEFT PANEL — Brand / Animated Hero ========== */}
      <section className="relative hidden w-1/2 flex-col overflow-hidden bg-gradient-to-br from-brand-900 via-[#1a0d3d] to-[#0f0624] md:flex">
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent" />

        {/* Floating orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Animated grid lines */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        {/* Animated particles */}
        <ParticlesBackground />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-10 lg:px-16 animate-fade-in-up">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-purple-300" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">
              Finspect
            </span>
          </div>

          {/* Animated tagline */}
          <div className="relative h-24 overflow-hidden mb-4" aria-live="polite">
            <div
              className="tagline-slider"
              style={{ transform: `translateY(-${taglineIdx * 6}rem)` }}
            >
              {TAGLINES.map((line, i) => (
                <p key={i} className="flex h-24 items-center text-4xl font-extrabold leading-tight text-white">
                  {line}
                </p>
              ))}
            </div>
          </div>

          <p className="mb-10 max-w-md text-base text-purple-200/70 leading-relaxed">
            The all-in-one platform for financial practices to manage clients, tasks, credentials, compliance, and team productivity.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {FEATURES.map((feat, i) => (
              <div
                key={i}
                className="feature-pill"
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                <feat.icon className="h-3.5 w-3.5 text-purple-300" />
                <span>{feat.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 border-t border-white/5 px-10 lg:px-16 py-5">
          <p className="text-xs text-purple-300/40">
            &copy; {new Date().getFullYear()} Finspect. All rights reserved.
          </p>
        </div>
      </section>

      {/* ========== RIGHT PANEL — Form ========== */}
      <section className="relative flex w-full items-center justify-center bg-slate-50 px-6 dark:bg-slate-950 md:w-1/2">
        {/* Mobile brand bar */}
        <div className="absolute left-0 top-0 flex w-full items-center justify-center gap-2 py-5 lg:hidden">
          <Sparkles className="h-4 w-4 text-brand-500" />
          <span className="text-lg font-extrabold text-brand-900 dark:text-white">Finspect</span>
        </div>

        <div className="w-full max-w-sm animate-fade-in-up">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isSignUp
              ? "Fill in your details to get started."
              : "Sign in to access your dashboard."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {/* Name field — sign up only */}
            {isSignUp && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</span>
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
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Email</span>
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
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Password</span>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {/* Role selection — sign up only */}
            {isSignUp && (
              <fieldset>
                <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">I want to join as</span>
                <div className="space-y-2">
                  {ROLES.map((role) => (
                    <label
                      key={role.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                        form.role === role.value
                          ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500/30 dark:border-brand-500 dark:bg-brand-900/30"
                          : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600"
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

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isSignUp ? "Creating account..." : "Signing in..."}
                </span>
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
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="font-semibold text-brand-500 hover:text-brand-700 underline decoration-1 underline-offset-2 transition hover:decoration-2"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </section>
    </div>
    </>
  );
}
