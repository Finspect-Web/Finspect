import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { searchGlobal } from "../api/searchApi";

const emptyResults = {
  clients: [],
  passwords: [],
  documents: []
};

function updatePopupPosition(anchorEl, popupEl) {
  if (!anchorEl || !popupEl) return;

  const anchorRect = anchorEl.getBoundingClientRect();
  const popupRect = popupEl.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = anchorRect.bottom + 8;
  let left = anchorRect.left;

  // Prevent horizontal overflow
  if (left + popupRect.width > viewportWidth - 16) {
    left = Math.max(16, viewportWidth - popupRect.width - 16);
  }

  // Prevent vertical overflow — flip above if needed
  if (top + popupRect.height > viewportHeight - 16) {
    top = Math.max(16, anchorRect.top - popupRect.height - 8);
  }

  popupEl.style.top = `${top}px`;
  popupEl.style.left = `${left}px`;
  popupEl.style.width = `${Math.max(320, anchorRect.width)}px`;
}

export default function MasterSearch({ className = "" }) {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const popupRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(emptyResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // ── Keyboard shortcut (Cmd+K) ──────────────────────────────
  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setIsDropdownOpen(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  // ── Escape key ──────────────────────────────────────────────
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isDropdownOpen]);

  // ── Click outside ──────────────────────────────────────────
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target) &&
        popupRef.current &&
        !popupRef.current.contains(event.target)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [isDropdownOpen]);

  // ── Reposition popup on scroll / resize ────────────────────
  const reposition = useCallback(() => {
    if (!isDropdownOpen) return;
    updatePopupPosition(wrapperRef.current, popupRef.current);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!isDropdownOpen) return;

    // Reposition on next frame so the DOM has painted the popup
    const raf = requestAnimationFrame(() =>
      updatePopupPosition(wrapperRef.current, popupRef.current)
    );

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isDropdownOpen, reposition]);

  // ── Debounced search ───────────────────────────────────────
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(emptyResults);
      setLoading(false);
      setError("");
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const data = await searchGlobal(term);
        if (active) {
          setResults(data);
          setError("");
        }
      } catch (searchError) {
        if (active) {
          setError(searchError.message);
          setResults(emptyResults);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  // ── Derived ────────────────────────────────────────────────
  const hasResults = useMemo(
    () => results.clients.length > 0 || results.passwords.length > 0 || results.documents.length > 0,
    [results]
  );

  const goTo = (path) => {
    setIsDropdownOpen(false);
    setQuery("");
    setResults(emptyResults);
    setLoading(false);
    setError("");
    navigate(path);
  };

  // ── Dropdown content (shared between both rendering paths) ─
  const dropdownContent = () => {
    if (loading) return <p className="px-1 text-sm text-slate-500">Searching…</p>;
    if (error) return <p className="px-1 text-sm font-medium text-rose-600">{error}</p>;
    if (query.trim().length < 2)
      return <p className="px-1 text-sm text-slate-500">Type at least 2 characters to search.</p>;
    if (!hasResults)
      return <p className="px-1 text-sm text-slate-500">No matches found.</p>;

    return (
      <>
        {results.clients.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">Clients</h3>
            <div className="space-y-1" role="listbox">
              {results.clients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  role="option"
                  onClick={() => goTo(`/clients/${client.id}`)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition hover:bg-brand-50/60 dark:hover:bg-slate-800"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {client.companyName || client.name}
                    </p>
                    {client.companyName && (
                      <p className="text-xs text-slate-500">{client.name}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {results.passwords.length > 0 && (
          <section className="mt-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">Passwords</h3>
            <div className="space-y-1" role="listbox">
              {results.passwords.map((pwd) => (
                <button
                  key={pwd.id}
                  type="button"
                  role="option"
                  onClick={() => goTo(`/clients/${pwd.client.id}?tab=passwords`)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition hover:bg-brand-50/60 dark:hover:bg-slate-800"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {pwd.type}{" "}
                      <span className="font-normal text-slate-500">→ {pwd.username}</span>
                    </p>
                    <p className="text-xs text-slate-500">{pwd.client.companyName}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {results.documents.length > 0 && (
          <section className="mt-3">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">Documents</h3>
            <div className="space-y-1" role="listbox">
              {results.documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  role="option"
                  onClick={() => goTo(`/clients/${doc.client.id}?tab=documents`)}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-sm transition hover:bg-brand-50/60 dark:hover:bg-slate-800"
                >
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{doc.name}</p>
                    <p className="text-xs text-slate-500">{doc.client.companyName}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </>
    );
  };

  const dropdownElement = isDropdownOpen
    ? createPortal(
        <div
          ref={popupRef}
          role="listbox"
          className="fixed rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{
            zIndex: 50,
            maxHeight: "min(60vh, 480px)",
            overflowY: "auto",
            animation: "searchFadeIn 150ms ease-out"
          }}
        >
          <div className="p-4">{dropdownContent()}</div>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="flex h-12 w-full items-center gap-3 rounded-full border-2 border-brand-400 bg-slate-50 px-4 text-sm text-slate-700 shadow-sm transition hover:shadow-md focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-400/30 dark:border-brand-500 dark:bg-slate-800 dark:text-slate-200">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-brand-600 dark:text-brand-300">
          <Search size={18} />
        </div>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Search…"
          style={{ boxShadow: "none" }}
          className="w-full border-0 bg-transparent p-0 text-sm font-medium outline-none placeholder:text-slate-400 focus:ring-0"
        />
      </div>

      {dropdownElement}
    </div>
  );
}
