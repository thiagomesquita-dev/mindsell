import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface FilterState {
  carteira: string;
  operador: string;
}

interface FilterPersistenceContextValue {
  carteira: string;
  operador: string;
  setCarteira: (v: string) => void;
  setOperador: (v: string) => void;
}

const STORAGE_KEY = "mindsell_filters";

function loadFromStorage(): FilterState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { carteira: "Todas", operador: "Todos" };
}

function saveToStorage(state: FilterState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

const FilterPersistenceContext = createContext<FilterPersistenceContextValue | null>(null);

export function FilterPersistenceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FilterState>(loadFromStorage);

  useEffect(() => {
    saveToStorage(state);
  }, [state]);

  const setCarteira = useCallback((v: string) => {
    setState((prev) => ({ ...prev, carteira: v, operador: "Todos" }));
  }, []);

  const setOperador = useCallback((v: string) => {
    setState((prev) => ({ ...prev, operador: v }));
  }, []);

  return (
    <FilterPersistenceContext.Provider value={{ carteira: state.carteira, operador: state.operador, setCarteira, setOperador }}>
      {children}
    </FilterPersistenceContext.Provider>
  );
}

export function useFilterPersistence() {
  const ctx = useContext(FilterPersistenceContext);
  if (!ctx) throw new Error("useFilterPersistence must be used within FilterPersistenceProvider");
  return ctx;
}
