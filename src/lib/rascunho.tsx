import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useAviso } from "@/components/Avisos";

export type Rascunho = {
  /** Salva o formulário pendente. Retorna false se a validação impedir. */
  salvar: () => boolean;
  /** Descarta as alterações, voltando aos dados originais. */
  descartar: () => void;
};

type Ctx = {
  /** Registra (ou remove, com null) o formulário de edição com alterações pendentes. */
  registrar: (chave: string, rascunho: Rascunho | null) => void;
  /** Retorna true quando há formulários com alterações não salvas. */
  temPendentes: () => boolean;
  /** Retorna true quando a navegação pode continuar. */
  liberarNavegacao: () => Promise<boolean>;
};

const RascunhoContext = createContext<Ctx | null>(null);

export function RascunhoProvider({ children }: { children: ReactNode }) {
  const pendentes = useRef(new Map<string, Rascunho>());
  const { escolher, avisar } = useAviso();

  const registrar = useCallback((chave: string, rascunho: Rascunho | null) => {
    if (rascunho) pendentes.current.set(chave, rascunho);
    else pendentes.current.delete(chave);
  }, []);

  const temPendentes = useCallback(() => pendentes.current.size > 0, []);

  const liberarNavegacao = useCallback(async () => {
    if (pendentes.current.size === 0) return true;
    const resposta = await escolher({
      titulo: "As últimas modificações não foram salvas",
      mensagem: "Deseja salvar elas?",
      secundarioLabel: "Desfazer Alterações",
      confirmarLabel: "Salvar Alterações",
      perigo: true,
    });
    const lista = [...pendentes.current.values()];
    if (resposta === "confirmar") {
      for (const r of lista) {
        if (!r.salvar()) {
          await avisar({
            titulo: "Não foi possível salvar",
            mensagem: "Corrija os dados do formulário antes de sair desta tela.",
            perigo: true,
          });
          return false;
        }
      }
    } else {
      lista.forEach((r) => r.descartar());
    }
    pendentes.current.clear();
    return true;
  }, [escolher, avisar]);

  const value = useMemo<Ctx>(
    () => ({ registrar, temPendentes, liberarNavegacao }),
    [registrar, temPendentes, liberarNavegacao],
  );

  return <RascunhoContext.Provider value={value}>{children}</RascunhoContext.Provider>;
}

export function useRascunho() {
  const ctx = useContext(RascunhoContext);
  if (!ctx) throw new Error("useRascunho fora do RascunhoProvider");
  return ctx;
}

/** Registra um formulário como rascunho pendente enquanto os dados diferirem do inicial. */
export function useRascunhoForm<T>(
  chave: string,
  form: T,
  inicial: T,
  salvar: () => boolean,
  descartar: () => void,
) {
  const { registrar } = useRascunho();
  const dirty = JSON.stringify(form) !== JSON.stringify(inicial);
  useEffect(() => {
    if (dirty) registrar(chave, { salvar, descartar });
    else registrar(chave, null);
    return () => {
      registrar(chave, null);
    };
  }, [chave, dirty, registrar, salvar, descartar]);
}
