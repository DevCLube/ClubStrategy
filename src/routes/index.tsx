import { FileSpreadsheet, Users, Clock, DoorOpen, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { resumoCategorias, turmasLotadas } from "@/lib/derive";
import { iconeDe } from "@/lib/icones";
import { useStore } from "@/lib/store";
import { ExportarRelatorioDialog, type TipoRelatorio } from "@/components/ExportarRelatorioDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — ClubStrategy | Clube Pirassununga" },
      {
        name: "description",
        content:
          "Visão geral das aulas do Clube Pirassununga: alunos matriculados, lista de espera, turmas lotadas e resumo por modalidade.",
      },
      { property: "og:title", content: "Dashboard — ClubStrategy" },
      {
        property: "og:description",
        content: "Gestão de listas de espera e turmas das aulas do Clube Pirassununga.",
      },
    ],
  }),
  component: Dashboard,
});

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Dashboard() {
  const { categorias } = useStore();
  const [exportando, setExportando] = useState<TipoRelatorio | null>(null);
  const resumo = useMemo(() => resumoCategorias(categorias), [categorias]);
  const { lotadas, comVaga } = useMemo(() => turmasLotadas(categorias), [categorias]);
  const totalMatriculados = resumo.reduce((s, r) => s + r.matriculados, 0);
  const totalEspera = resumo.reduce((s, r) => s + r.espera, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão macro das aulas e das listas de espera do clube.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          onClick={() => setExportando("5")}
        >
          <FileSpreadsheet className="h-4 w-4" /> Exportar relatório
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label="Alunos matriculados"
          value={totalMatriculados}
          hint="Ativos em todas as modalidades"
        />
        <Kpi
          icon={Clock}
          label="Em lista de espera"
          value={totalEspera}
          hint="Somando todas as turmas"
        />
        <Kpi
          icon={AlertTriangle}
          label="Turmas lotadas"
          value={lotadas.length}
          hint="Atingiram o limite de vagas"
        />
        <Kpi
          icon={DoorOpen}
          label="Turmas com vaga"
          value={comVaga}
          hint="Ainda aceitam matrícula direta"
        />
      </div>

      <section className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
        <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          Resumo por modalidade
        </h2>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3">
          {resumo.map((r) => {
            const Icon = iconeDe(r.icone);
            return (
              <Link
                key={r.id}
                to="/categoria/$slug"
                params={{ slug: r.id }}
                className="flex flex-col gap-1 border-border p-4 transition-colors hover:bg-secondary sm:border-r sm:border-b"
              >
                <p className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <Icon className="h-4 w-4 text-primary" /> {r.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.turmas} turmas · {r.matriculados} matriculados · {r.vagas} vaga(s)
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                    {r.espera} na espera
                  </span>
                  {r.lotadas > 0 && (
                    <span className="w-fit rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {r.lotadas} lotada(s)
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
        <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">
          Turmas lotadas — onde a demanda está maior
        </h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {["Modalidade", "Turma", "Dia", "Horário", "Sala", "Ocupação", "Na espera"].map(
                (h) => (
                  <th key={h} className="px-4 py-2 font-semibold">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {lotadas.map((t) => (
              <tr key={t.id} className="border-t border-border bg-primary/5">
                <td className="px-4 py-2 font-medium text-foreground">{t.categoria}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.turma}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.dia}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.horario}</td>
                <td className="px-4 py-2 text-muted-foreground">{t.sala}</td>
                <td className="px-4 py-2 font-semibold text-primary">{t.ocupacao}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                    {t.espera}
                  </span>
                </td>
              </tr>
            ))}
            {lotadas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhuma turma lotada no momento.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {exportando && (
        <ExportarRelatorioDialog onClose={() => setExportando(null)} tipoInicial={exportando} />
      )}
    </div>
  );
}
