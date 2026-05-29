import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export default function Modal({ children, onClose, className = "" }) {
  if (typeof document === "undefined") return null;

  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  return createPortal(
    <>
      {/* Fullscreen backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`relative w-full max-w-[500px] rounded-2xl bg-white px-6 pb-6 pt-6 shadow-2xl dark:bg-slate-900 ${className}`}
          onClick={(event) => event.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
