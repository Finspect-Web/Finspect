import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchGlobal } from "../api/searchApi";

const emptyResults = {
  clients: [],
  passwords: [],
  documents: []
};

export default function MasterSearch({ isOpen, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(emptyResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults(emptyResults);
      setLoading(false);
      setError("");
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleShortcut = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [query, isOpen]);

  const hasResults = useMemo(
    () => results.clients.length > 0 || results.passwords.length > 0 || results.documents.length > 0,
    [results]
  );

  const goTo = (path) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 px-4 py-10 backdrop-blur-sm" onClick={onClose}>
      <div className="mt-8 w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
            <Search size={18} className="text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search anything..."
              className="w-full border-0 bg-transparent p-0 text-sm outline-none placeholder:text-slate-400 dark:text-white"
            />
            <span className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Esc
            </span>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4">
          {loading ? <p className="text-sm text-slate-500">Searching...</p> : null}
          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          {!loading && !error && query.trim().length < 2 ? (
            <p className="text-sm text-slate-500">Type at least 2 characters to search clients, passwords, and documents.</p>
          ) : null}

          {!loading && !error && query.trim().length >= 2 && !hasResults ? (
            <p className="text-sm text-slate-500">No matches found.</p>
          ) : null}

          {results.clients.length > 0 ? (
            <section className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Clients</h3>
              <div className="space-y-2">
                {results.clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      navigate(`/client/${client.id}`);
                      onClose();
                    }}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{client.companyName || client.name}</p>
                      {client.companyName ? <p className="text-xs text-slate-500">{client.name}</p> : null}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {results.passwords.length > 0 ? (
            <section className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Passwords</h3>
              <div className="space-y-2">
                {results.passwords.map((password) => (
                  <button
                    key={password.id}
                    type="button"
                    onClick={() => goTo(`/client/${password.client.id}?tab=passwords`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {password.type} <span className="font-normal text-slate-500">→ {password.username}</span>
                      </p>
                      <p className="text-xs text-slate-500">{password.client.companyName}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {results.documents.length > 0 ? (
            <section className="mt-4">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Documents</h3>
              <div className="space-y-2">
                {results.documents.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => goTo(`/client/${document.client.id}?tab=documents`)}
                    className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{document.name}</p>
                      <p className="text-xs text-slate-500">{document.client.companyName}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}