import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Info } from "lucide-react";

type Tipo = "aviso" | "confirmacao" | "escolha";

export type Pedido = {
  tipo: Tipo;
  titulo: string;
  mensagem?: string;
  /** Linhas de destaque (ex: "Spinning — Salão Novo   16/16"). */
  linhas?: string[];
  confirmarLabel?: string;
  cancelarLabel?: string;
  /** Terceira opção usada no aviso de alterações não salvas. */
  secundarioLabel?: string;
  perigo?: boolean;
};

type Resposta = "confirmar" | "cancelar" | "secundario";

type Ctx = {
  avisar: (p: Omit<Pedido, "tipo">) => Promise<void>;
  confirmar: (p: Omit<Pedido, "tipo">) => Promise<boolean>;
  escolher: (p: Omit<Pedido, "tipo">) => Promise<Resposta>;
};

const AvisoContext = createContext<Ctx | null>(null);

const btnPrim =
  "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark";
const btnSec =
  "inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary";

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<(Pedido & { resolver: (r: Resposta) => void }) | null>(null);

  const abrir = useCallback(
    (p: Pedido) =>
      new Promise<Resposta>((resolve) => {
        setPedido({ ...p, resolver: resolve });
      }),
    [],
  );

  const value = useMemo<Ctx>(
    () => ({
      avisar: async (p) => {
        await abrir({ ...p, tipo: "aviso" });
      },
      confirmar: async (p) => (await abrir({ ...p, tipo: "confirmacao" })) === "confirmar",
      escolher: (p) => abrir({ ...p, tipo: "escolha" }),
    }),
    [abrir],
  );

  const responder = (r: Resposta) => {
    pedido?.resolver(r);
    setPedido(null);
  };

  return (
    <AvisoContext.Provider value={value}>
      {children}
      {pedido && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/45 p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 rounded-md p-1.5 ${
                  pedido.perigo
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {pedido.perigo ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <Info className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-foreground">{pedido.titulo}</h3>
                {pedido.linhas && pedido.linhas.length > 0 && (
                  <div className="mt-3 space-y-1 rounded-md border border-border bg-background px-3 py-2">
                    {pedido.linhas.map((l, i) => (
                      <p
                        key={i}
                        className={
                          i === 0
                            ? "text-sm font-semibold text-foreground"
                            : "text-sm text-muted-foreground"
                        }
                      >
                        {l}
                      </p>
                    ))}
                  </div>
                )}
                {pedido.mensagem && (
                  <p className="mt-3 text-sm text-muted-foreground">{pedido.mensagem}</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {pedido.tipo === "aviso" && (
                <button className={btnPrim} type="button" onClick={() => responder("confirmar")}>
                  {pedido.confirmarLabel ?? "Entendi"}
                </button>
              )}
              {pedido.tipo === "confirmacao" && (
                <>
                  <button className={btnSec} type="button" onClick={() => responder("cancelar")}>
                    {pedido.cancelarLabel ?? "Cancelar"}
                  </button>
                  <button className={btnPrim} type="button" onClick={() => responder("confirmar")}>
                    {pedido.confirmarLabel ?? "Confirmar"}
                  </button>
                </>
              )}
              {pedido.tipo === "escolha" && (
                <>
                  <button className={btnSec} type="button" onClick={() => responder("secundario")}>
                    {pedido.secundarioLabel ?? "Desfazer Alterações"}
                  </button>
                  <button className={btnPrim} type="button" onClick={() => responder("confirmar")}>
                    {pedido.confirmarLabel ?? "Salvar Alterações"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AvisoContext.Provider>
  );
}

export function useAviso() {
  const ctx = useContext(AvisoContext);
  if (!ctx) throw new Error("useAviso fora do AvisoProvider");
  return ctx;
}
