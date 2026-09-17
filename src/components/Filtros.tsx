import type { Categoria } from "@/lib/mock-data";

export type FiltroState = {
  nome: string;
  matricula: string;
  idade: string;
  categoria: string;
  turma: string;
  de: string;
  ate: string;
};

export const filtroVazio: FiltroState = {
  nome: "",
  matricula: "",
  idade: "",
  categoria: "",
  turma: "",
  de: "",
  ate: "",
};

const inputCls =
  "h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary";

function atalho(dias: number) {
  const hoje = new Date();
  const de = new Date(hoje);
  de.setDate(hoje.getDate() - dias);
  return { de: de.toISOString().slice(0, 10), ate: hoje.toISOString().slice(0, 10) };
}

export function Filtros({
  value,
  onChange,
  categorias,
}: {
  value: FiltroState;
  onChange: (f: FiltroState) => void;
  categorias: Categoria[];
}) {
  const set = (patch: Partial<FiltroState>) => onChange({ ...value, ...patch });
  const cat = categorias.find((c) => c.nome === value.categoria);
  const turmas = Array.from(
    new Set(
      (cat ? [cat] : categorias).flatMap((c) => c.dias.flatMap((d) => d.turmas.map((t) => t.nome))),
    ),
  ).sort();

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <label className="text-xs font-medium text-muted-foreground">
          Nome do aluno
          <input
            className={`${inputCls} mt-1`}
            value={value.nome}
            onChange={(e) => set({ nome: e.target.value })}
            placeholder="Ex: Ana"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Matrícula
          <input
            className={`${inputCls} mt-1`}
            value={value.matricula}
            onChange={(e) => set({ matricula: e.target.value })}
            placeholder="Ex: 1024"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Idade
          <input
            type="number"
            className={`${inputCls} mt-1`}
            value={value.idade}
            onChange={(e) => set({ idade: e.target.value })}
            placeholder="Ex: 12"
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Modalidade
          <select
            className={`${inputCls} mt-1`}
            value={value.categoria}
            onChange={(e) => set({ categoria: e.target.value, turma: "" })}
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.nome}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Turma
          <select
            className={`${inputCls} mt-1`}
            value={value.turma}
            onChange={(e) => set({ turma: e.target.value })}
          >
            <option value="">Todas</option>
            {turmas.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Data inicial
          <input
            type="date"
            className={`${inputCls} mt-1`}
            value={value.de}
            onChange={(e) => set({ de: e.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Data final
          <input
            type="date"
            className={`${inputCls} mt-1`}
            value={value.ate}
            onChange={(e) => set({ ate: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Atalhos:</span>
        {[
          { l: "Última semana", d: 7 },
          { l: "Último mês", d: 30 },
          { l: "Último ano", d: 365 },
        ].map((a) => (
          <button
            key={a.l}
            type="button"
            onClick={() => set(atalho(a.d))}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {a.l}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(filtroVazio)}
          className="ml-auto rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

export function dentroDoPeriodo(data: string, de: string, ate: string) {
  const d = data.slice(0, 10);
  if (de && d < de) return false;
  if (ate && d > ate) return false;
  return true;
}
