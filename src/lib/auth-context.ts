import { createContext } from "react";

export type AuthCtx = {
  pronto: boolean;
  autenticado: boolean;
  entrar: (usuario: string, senha: string) => boolean;
  sair: () => void;
};

export const AuthContext = createContext<AuthCtx | null>(null);
