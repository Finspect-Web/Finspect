import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

const STATUS_TEXTS = [
  "Preparing your workspace...",
  "Loading compliance dashboard...",
  "Syncing workflows...",
  "Fetching client data...",
  "Setting up your dashboard...",
];

const SIGNUP_TEXTS = [
  "Creating your account...",
  "Setting up your profile...",
  "Securing your credentials...",
  "Initializing workspace...",
  "Almost ready...",
];

export default function Loader({
  isSignUp = false,
  duration = 3200,
  onComplete,
  userName = "",
}) {
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const mountedRef = useRef(true);

  const texts = isSignUp ? SIGNUP_TEXTS : STATUS_TEXTS;

  // Animate progress with realistic curve
  useEffect(() => {
    // CRITICAL: must reset to true — React StrictMode unmounts & remounts,
    // which would leave mountedRef stuck at false from the cleanup
    mountedRef.current = true;

    const steps = [
      { progress: 20, delay: 100 },
      { progress: 40, delay: 300 },
      { progress: 55, delay: 550 },
      { progress: 68, delay: 800 },
      { progress: 78, delay: 1050 },
      { progress: 88, delay: 1300 },
      { progress: 95, delay: 1500 },
    ];

    const timers = steps.map((step) =>
      setTimeout(() => {
        if (mountedRef.current) setProgress(step.progress);
      }, step.delay)
    );

    const completeTimer = setTimeout(() => {
      if (mountedRef.current) {
        setProgress(100);
        setTimeout(() => {
          if (mountedRef.current) onComplete?.();
        }, 350);
      }
    }, duration);

    return () => {
      mountedRef.current = false;
      timers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  // Sync status text rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex((prev) => (prev + 1) % texts.length);
    }, 1600);
    return () => clearInterval(interval);
  }, [texts]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-950"
    >
      {/* Subtle brand gradient overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="absolute inset-0 bg-gradient-to-br from-brand-50/60 via-white to-brand-50/40 dark:from-slate-950/80 dark:via-slate-900/60 dark:to-slate-950/80"
      />

      {/* Animated brand-tinted orbs — much subtler for light theme */}
      <motion.div
        animate={{
          x: [0, 30, -15, 20, 0],
          y: [0, -25, 30, -15, 0],
          scale: [1, 1.08, 0.97, 1.03, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[120px] -right-[120px] h-[400px] w-[400px] rounded-full opacity-20 pointer-events-none dark:opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(76, 44, 167, 0.25), transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <motion.div
        animate={{
          x: [0, -25, 15, -30, 0],
          y: [0, 30, -20, 15, 0],
          scale: [1, 0.92, 1.1, 0.98, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-[10%] -left-[80px] h-[300px] w-[300px] rounded-full opacity-15 pointer-events-none dark:opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(76, 44, 167, 0.3), transparent 70%)",
          filter: "blur(80px)",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(76, 44, 167, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(76, 44, 167, 0.08) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ========== CENTER CONTENT ========== */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Card — matches app's card design: white bg, slate border, soft shadow */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-12 py-14 shadow-soft sm:px-16 dark:border-slate-700 dark:bg-slate-900"
        >
          {/* Glow ring behind logo — brand tinted */}
          <motion.div
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.45, 0.2],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-6 h-32 w-32 rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/20"
          />

          {/* Animated Logo */}
          <div className="relative mb-6">
            <motion.div
              animate={{
                scale: [1, 1.04, 1],
                rotate: [0, 3, -2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/60 ring-1 ring-brand-200/60 overflow-hidden dark:from-brand-900/40 dark:to-brand-700/30 dark:ring-brand-700/50"
            >
              <motion.div
                animate={{
                  scale: [1, 1.08, 1],
                }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Shield className="h-7 w-7 text-brand-500 dark:text-brand-100" />
              </motion.div>
            </motion.div>

            {/* Shimmer sweep — light brand tint */}
            <motion.div
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
                repeatDelay: 1,
              }}
              className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-brand-100/40 to-transparent dark:via-brand-500/20"
            />
          </div>

          {/* Brand name — app brand color */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mb-1 text-3xl font-extrabold tracking-tight text-brand-900 dark:text-brand-100"
          >
            Finspect
          </motion.h1>

          {/* Greeting for signup */}
          {isSignUp && userName && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-4 text-sm text-slate-500 dark:text-slate-400"
            >
              Welcome, {userName}
            </motion.p>
          )}

          {/* Rotating status text */}
          <div className="relative h-7 w-64 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={statusIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400"
              >
                <motion.span
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {texts[statusIndex]}
                </motion.span>
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div className="mt-8 w-64">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-brand-50 dark:bg-brand-900/40">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              {/* Glow on progress bar */}
              <motion.div
                className="absolute -top-1 h-3 w-12 rounded-full bg-brand-500/25 blur-md"
                animate={{ left: `${progress}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ marginLeft: -24 }}
              />
            </div>

            {/* Percentage counter */}
            <motion.p className="mt-2 text-center text-xs font-medium text-brand-500/70 tabular-nums dark:text-brand-100/80">
              {progress}%
            </motion.p>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-8 text-xs tracking-[0.15em] text-slate-400 uppercase dark:text-slate-600"
        >
          Compliance &bull; Workflow &bull; Productivity
        </motion.p>
      </div>
    </motion.div>
  );
}
