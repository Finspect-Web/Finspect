export default function Modal({ children, onClose, className = "" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6" onClick={onClose}>
      <div
        className={`w-full max-w-[500px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}