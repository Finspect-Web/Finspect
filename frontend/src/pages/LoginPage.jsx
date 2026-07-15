import { Eye, EyeOff, LogIn, Sparkles, Building2, Shield, Users } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ParticlesBackground from "../components/ParticlesBackground";
import Loader from "../components/Loader";

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
  const { login } = useAuth();
  const [showAuthLoader, setShowAuthLoader] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taglineIdx, setTaglineIdx] = useState(0);

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
      await login({ email: form.email, password: form.password });

      // Show loader for ~2s, then navigate to dashboard
      setShowAuthLoader(true);
    } catch (submitError) {
      setError(submitError.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Navigate to dashboard when the Loader animation completes
  const handleLoaderComplete = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Premium loading screen */}
      {showAuthLoader && (
        <Loader
          isSignUp={false}
          userName=""
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
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Sign in to access your dashboard.
          </p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">Email</span>
              <input
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

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => alert("Please contact your administrator to reset your password.")}
                className="text-xs font-medium text-slate-500 underline decoration-1 underline-offset-2 transition hover:text-brand-700 hover:decoration-2 dark:text-slate-400 dark:hover:text-brand-400"
              >
                Forgot Password?
              </button>
            </div>

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
                  Signing in...
                </span>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
    </>
  );
}
