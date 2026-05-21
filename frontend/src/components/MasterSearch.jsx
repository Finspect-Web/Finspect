import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchGlobal } from "../api/searchApi";

const emptyResults = {
  clients: [],
  passwords: [],
  documents: []
};

export default function MasterSearch({ className = "" }) {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(emptyResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

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

  return (
    <div ref={searchRef} className={`relative ${className}`}>
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
          placeholder="Search..."
          style={{ boxShadow: "none" }}
          className="w-full border-0 bg-transparent p-0 text-sm font-medium outline-none placeholder:text-slate-400 focus:ring-0"
        />
      </div>

      {isDropdownOpen ? (
        <div className="absolute right-0 mt-2 w-[420px] overflow-hidden rounded-2xl border border-brand-200/60 bg-white shadow-xl dark:border-brand-500/30 dark:bg-slate-900">
          <div className="max-h-[60vh] overflow-y-auto p-4">
            {loading ? <p className="text-sm text-slate-500">Searching...</p> : null}
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

            {!loading && !error && query.trim().length < 2 ? (
              <p className="text-sm text-slate-500">Type at least 2 characters to search.</p>
            ) : null}

            {!loading && !error && query.trim().length >= 2 && !hasResults ? (
              <p className="text-sm text-slate-500">No matches found.</p>
            ) : null}

            {results.clients.length > 0 ? (
              <section className="mt-4">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">Clients</h3>
                <div className="space-y-2">
                  {results.clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => goTo(`/clients/${client.id}`)}
                      className="flex w-full items-center justify-between rounded-xl border border-brand-200/60 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-brand-500/30 dark:bg-slate-900 dark:hover:bg-slate-800"
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
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">Passwords</h3>
                <div className="space-y-2">
                  {results.passwords.map((password) => (
                    <button
                      key={password.id}
                      type="button"
                      onClick={() => goTo(`/clients/${password.client.id}?tab=passwords`)}
                      className="flex w-full items-center justify-between rounded-xl border border-brand-200/60 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-brand-500/30 dark:bg-slate-900 dark:hover:bg-slate-800"
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
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-500">Documents</h3>
                <div className="space-y-2">
                  {results.documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => goTo(`/clients/${document.client.id}?tab=documents`)}
                      className="flex w-full items-center justify-between rounded-xl border border-brand-200/60 bg-white px-4 py-3 text-left shadow-sm transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-brand-500/30 dark:bg-slate-900 dark:hover:bg-slate-800"
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
      ) : null}
    </div>
  );
}
