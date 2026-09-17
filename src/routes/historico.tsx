import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Filtros, dentroDoPeriodo, filtroVazio } from "@/components/Filtros";
import { formatDateTime } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { ExportarRelatorioDialog } from "@/components/ExportarRelatorioDialog";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [
      { title: "Histórico de Edições — ClubStrategy" },
      {
        name: "description",
        content:
          "Auditoria de adições, remoções e promoções de alunos nas listas de aulas do Clube Pirassununga.",
      },
      { property: "og:title", content: "Histórico de Edições — ClubStrategy" },
      {
        property: "og:description",
        content:
          "Registro permanente das alterações feitas nas listas de matriculados e de espera.",
      },
    ],
  }),
  component: HistoricoPage,
});

const cores: Record<string, string> = {
  adicionado: "bg-secondary text-foreground",
  removido: "bg-accent text-accent-foreground",
  promovido: "bg-secondary text-primary",
  transferido: "bg-secondary text-primary",
  editado: "bg-secondary text-muted-foreground",
};

function HistoricoPage() {
  const { categorias, historico } = useStore();
  const [filtro, setFiltro] = useState(filtroVazio);
  const [exportando, setExportando] = useState(false);
  /** Lote inicial renderizado; "Mostrar mais" incrementa (histórico só cresce). */
  const [limite, setLimite] = useState(400);

  const linhas = useMemo(
    () =>
      historico.filter((e) => {
        if (filtro.nome && !e.aluno.nome.toLowerCase().includes(filtro.nome.toLowerCase()))
          return false;
        if (filtro.matricula && !e.aluno.matricula.includes(filtro.matricula)) return false;
        if (filtro.idade && e.aluno.idade !== Number(filtro.idade)) return false;
        if (filtro.categoria && e.categoria !== filtro.categoria) return false;
        if (filtro.turma && e.turma !== filtro.turma) return false;
        if (!dentroDoPeriodo(e.dataHora, filtro.de, filtro.ate)) return false;
        return true;
      }),
    [historico, filtro],
  );

  const visiveis = linhas.slice(0, limite);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Histórico de Edições</h1>
          <p className="text-sm text-muted-foreground">
            Nada é apagado: alunos removidos das listas ativas permanecem registrados aqui.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          onClick={() => setExportando(true)}
        >
          <FileSpreadsheet className="h-4 w-4" /> Exportar relatório
        </button>
      </header>

      <Filtros value={filtro} onChange={setFiltro} categorias={categorias} />

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Registros de auditoria</h2>
          <span className="text-xs text-muted-foreground">{linhas.length} evento(s)</span>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {["Aluno", "Matrícula", "Ação", "Lista", "Turma", "Data/hora"].map((h) => (
                <th key={h} className="px-4 py-2 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium text-foreground">{e.aluno.nome}</td>
                <td className="px-4 py-2 text-muted-foreground">{e.aluno.matricula}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cores[e.acao]}`}
                  >
                    {e.acao}
                  </span>
                </td>
                <td className="px-4 py-2 text-muted-foreground capitalize">{e.lista}</td>
                <td className="px-4 py-2 text-muted-foreground">
                  {e.categoria} · {e.turma} · {e.dia} {e.horario}
                  {e.detalhe && <span className="block text-[11px]">{e.detalhe}</span>}
                </td>
                <td className="px-4 py-2 text-muted-foreground">{formatDateTime(e.dataHora)}</td>
              </tr>
            ))}
            {visiveis.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhuma edição registrada para esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {linhas.length > limite && (
          <div className="flex items-center justify-center gap-3 border-t border-border bg-secondary/40 px-4 py-3">
            <span className="text-xs text-muted-foreground">
              Mostrando {visiveis.length} de {linhas.length}
            </span>
            <button
              className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
              onClick={() => setLimite((l) => l + 400)}
            >
              Mostrar mais
            </button>
          </div>
        )}
      </div>

      {exportando && (
        <ExportarRelatorioDialog onClose={() => setExportando(false)} tipoInicial="4" />
      )}
    </div>
  );
}
