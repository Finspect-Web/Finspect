import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Delete",
  cancelText = "Cancel",
  confirmVariant = "danger",
  isLoading = false,
  onConfirm,
  onCancel
}) {
  if (typeof document === "undefined") return null;

  useEffect(() => {
    if (!isOpen) return;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmStyles = {
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
    primary:
      "bg-brand-900 text-white hover:bg-brand-800 focus:ring-brand-500"
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md animate-in zoom-in-95 duration-200 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Icon */}
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              confirmVariant === "danger"
                ? "bg-rose-100 dark:bg-rose-900/30"
                : "bg-brand-100 dark:bg-brand-900/30"
            }`}
          >
            <AlertTriangle
              size={24}
              className={
                confirmVariant === "danger"
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-brand-700 dark:text-brand-300"
              }
            />
          </div>

          {/* Title */}
          <h3 className="mt-4 text-center text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h3>

          {/* Message */}
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
            {message}
          </p>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition focus:ring-2 focus:outline-none disabled:opacity-50 ${confirmStyles[confirmVariant]}`}
            >
              {isLoading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
