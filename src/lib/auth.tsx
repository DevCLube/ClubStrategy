import { useContext, useEffect, useState, type ReactNode } from "react";
import { AuthContext } from "./auth-context";

const CHAVE = "clubstrategy-sessao";
const USUARIO = "esporte";
const SENHA = "1928";

type Sessao = { token: string; expira: number | null };

function ler(): Sessao | null {
  if (typeof window === "undefined") return null;
  for (const store of [window.sessionStorage, window.localStorage]) {
    try {
      const raw = store.getItem(CHAVE);
      if (!raw) continue;
      const s = JSON.parse(raw) as Sessao;
      if (s.expira && Date.now() > s.expira) {
        store.removeItem(CHAVE);
        continue;
      }
      if (s.token) return s;
    } catch {
      /* ignora */
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    setAutenticado(!!ler());
    setPronto(true);
  }, []);

  const entrar = (usuario: string, senha: string) => {
    if (usuario.trim().toLowerCase() !== USUARIO || senha !== SENHA) return false;
    const sessao: Sessao = {
      token: Math.random().toString(36).slice(2) + Date.now().toString(36),
      expira: null,
    };
    window.sessionStorage.setItem(CHAVE, JSON.stringify(sessao));
    setAutenticado(true);
    return true;
  };

  const sair = () => {
    window.sessionStorage.removeItem(CHAVE);
    window.localStorage.removeItem(CHAVE);
    setAutenticado(false);
  };

  return (
    <AuthContext.Provider value={{ pronto, autenticado, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}
