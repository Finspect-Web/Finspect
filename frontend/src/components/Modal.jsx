import { createPortal } from "react-dom";

export default function Modal({ children, onClose, className = "" }) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className={`mx-4 my-6 w-full max-w-[500px] rounded-2xl bg-white px-6 pb-6 pt-2 shadow-2xl dark:bg-slate-900 ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
