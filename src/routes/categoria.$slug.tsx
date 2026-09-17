import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TurmaColuna } from "@/components/TurmaColuna";
import { Modal, btnPrimary, inputCls } from "@/components/AlunoDialogs";
import { useAviso } from "@/components/Avisos";
import { HoraInput } from "@/components/HoraInput";
import { useRascunhoForm } from "@/lib/rascunho";
import { DIAS_SEMANA, ordenarDias, type Professor } from "@/lib/mock-data";
import { contarAlunos, useAcoes, useStore } from "@/lib/store";

export const Route = createFileRoute("/categoria/$slug")({
  head: ({ params }) => {
    const nome = params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
    return {
      meta: [
        { title: `${nome} — Turmas e listas | ClubStrategy` },
        {
          name: "description",
          content: `Gerencie os dias, horários, turmas, alunos matriculados e lista de espera de ${nome} no Clube Pirassununga.`,
        },
        { property: "og:title", content: `${nome} — Turmas e listas | ClubStrategy` },
        {
          property: "og:description",
          content: `Dias empilhados, colunas por horário e lista de espera de ${nome}.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: CategoriaPage,
  notFoundComponent: CategoriaNotFound,
});

const btnGhost =
  "inline-flex items-center gap-1.5 rounded border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-secondary";

function CategoriaNotFound() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    toast.error(`A modalidade “${slug}” não existe ou foi removida. Redirecionando...`);
    const t = setTimeout(() => navigate({ to: "/" }), 1200);
    return () => clearTimeout(t);
  }, [slug, navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-8 text-center shadow-[var(--shadow-card)]">
      <h1 className="text-2xl font-bold text-foreground">Modalidade não encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        A modalidade “{slug}” não existe ou foi removida. Você será redirecionado para o Dashboard.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Ir para o Dashboard agora
      </Link>
    </div>
  );
}

function CategoriaPage() {
  const { slug } = Route.useParams();
  const { categorias, professores } = useStore();
  const { addDia, removeDia, addTurma } = useAcoes();
  const { avisar, confirmar } = useAviso();
  const categoria = categorias.find((c) => c.id === slug);
  if (!categoria) throw notFound();

  const [aberto, setAberto] = useState<string | null>(categoria.dias[0]?.id ?? null);
  const [expand, setExpand] = useState<Record<string, boolean>>({});
  const [busca, setBusca] = useState("");
  const [novoDia, setNovoDia] = useState(false);
  const [novaTurma, setNovaTurma] = useState<string | null>(null);

  const alternarExpand = useCallback((turmaId: string) => {
    setExpand((p) => ({ ...p, [turmaId]: !(p[turmaId] ?? false) }));
  }, []);

  const dias = useMemo(() => {
    const ordenados = ordenarDias(categoria.dias);
    if (!busca.trim()) return ordenados;
    const q = busca.toLowerCase();
    return ordenados
      .map((d) => ({
        ...d,
        turmas: d.turmas.filter((t) =>
          `${t.nome} ${t.horario} ${d.nome} ${t.professor} ${t.sala}`.toLowerCase().includes(q),
        ),
      }))
      .filter((d) => d.turmas.length > 0);
  }, [categoria.dias, busca]);

  const diasDisponiveis = DIAS_SEMANA.filter((d) => !categoria.dias.some((x) => x.nome === d));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{categoria.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {categoria.dias.length} dia(s) · clique em um dia para ver as turmas por horário.
          </p>
        </div>
        <div>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder='Buscar turma (ex: "Yoga 8:30")'
            className="h-10 w-80 rounded-md border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary"
          />
          <p className="mt-1 w-80 text-xs text-muted-foreground">
            Você pode buscar pelo nome do professor ou pelo tipo de aula (ex: “Natação Infantil”),
            além do horário, dia e sala.
          </p>
        </div>
      </header>

      <div className="space-y-3">
        {dias.map((dia) => {
          const expandido = busca.trim() ? true : aberto === dia.id;
          const contagem = contarAlunos(dia.turmas);
          return (
            <section
              key={dia.id}
              className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-250"
            >
              <div className="flex w-full items-center gap-2 pr-3 transition-colors hover:bg-secondary">
                <button
                  className="flex flex-1 items-center justify-between gap-4 px-4 py-3 text-left"
                  onClick={() => {
                    const abre = expandido && !busca.trim() ? null : dia.id;
                    if (abre && !expandido) {
                      setExpand((p) => {
                        const n = { ...p };
                        dia.turmas.forEach((t) => delete n[t.id]);
                        return n;
                      });
                    }
                    setAberto(abre);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandido ? "rotate-180" : ""}`}
                    />
                    <span className="text-base font-semibold text-foreground">{dia.nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {dia.turmas.length} turma(s) · {contagem.matriculados} matriculados
                    </span>
                  </div>
                  {contagem.espera > 0 && (
                    <span className="rounded-full bg-accent px-3 py-0.5 text-xs font-semibold text-accent-foreground">
                      {contagem.espera} na espera
                    </span>
                  )}
                </button>
                <button
                  aria-label={`Excluir ${dia.nome}`}
                  title="Excluir dia da semana"
                  className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-card hover:text-primary"
                  onClick={async () => {
                    const total = contagem.matriculados + contagem.espera;
                    if (total > 0) {
                      await avisar({
                        titulo: `Não é possível excluir ${dia.nome}`,
                        mensagem: `${dia.nome} tem ${contagem.matriculados} matriculado(s) e ${contagem.espera} na lista de espera. Remova os alunos antes de excluir.`,
                        perigo: true,
                      });
                      return;
                    }
                    if (
                      await confirmar({
                        titulo: `Excluir ${dia.nome}?`,
                        mensagem: `Todos os horários de ${dia.nome} em ${categoria.nome} serão removidos.`,
                        confirmarLabel: "Excluir dia",
                        perigo: true,
                      })
                    ) {
                      const r = removeDia(categoria.id, dia.id);
                      if (!r.ok)
                        await avisar({
                          titulo: "Não foi possível excluir",
                          mensagem: r.erro ?? "Erro inesperado.",
                          perigo: true,
                        });
                      else if (aberto === dia.id) setAberto(null);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {expandido && (
                <div className="flex items-start gap-4 overflow-x-auto border-t border-border bg-background p-4">
                  {dia.turmas.map((t) => (
                    <TurmaColuna
                      key={t.id}
                      catId={categoria.id}
                      diaId={dia.id}
                      turma={t}
                      minimizado={!(expand[t.id] ?? false)}
                      onAlternar={alternarExpand}
                      professores={professores}
                    />
                  ))}
                  <button
                    className="flex h-40 w-56 shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
                    onClick={() => setNovaTurma(dia.id)}
                  >
                    <Plus className="h-5 w-5" /> Adicionar horário
                  </button>
                </div>
              )}
            </section>
          );
        })}

        {dias.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {busca.trim()
              ? `Nenhuma turma encontrada para “${busca}”.`
              : "Nenhum dia cadastrado nesta modalidade ainda."}
          </p>
        )}
      </div>

      <button
        className={btnGhost}
        onClick={() => setNovoDia(true)}
        disabled={diasDisponiveis.length === 0}
      >
        <Plus className="h-4 w-4" />{" "}
        {diasDisponiveis.length === 0 ? "Todos os dias já adicionados" : "Adicionar dia"}
      </button>

      {novoDia && (
        <NovoDiaDialog
          disponiveis={diasDisponiveis}
          onClose={() => setNovoDia(false)}
          onSubmit={(nome) => addDia(categoria.id, nome)}
        />
      )}

      {novaTurma && (
        <NovaTurmaDialog
          sugestaoNome={categoria.nome}
          professores={professores.filter((p) => p.modalidadeIds.includes(categoria.id))}
          onClose={() => setNovaTurma(null)}
          onSubmit={(t) => addTurma(categoria.id, novaTurma, t)}
        />
      )}
    </div>
  );
}

function NovoDiaDialog({
  disponiveis,
  onClose,
  onSubmit,
}: {
  disponiveis: string[];
  onClose: () => void;
  onSubmit: (nome: string) => { ok: boolean; erro?: string };
}) {
  const [nome, setNome] = useState(disponiveis[0] ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const inicial = disponiveis[0] ?? "";

  const salvar = () => {
    const r = onSubmit(nome);
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível adicionar o dia.");
      return false;
    }
    return true;
  };
  const descartar = () => setNome(inicial);
  useRascunhoForm("novo-dia", { nome }, { nome: inicial }, salvar, descartar);

  return (
    <Modal
      titulo="Adicionar dia da semana"
      descricao="Os dias são exibidos sempre na ordem de Segunda a Domingo."
      erro={erro}
      onClose={onClose}
      footer={
        <button
          className={btnPrimary}
          type="button"
          onClick={() => {
            if (salvar()) onClose();
          }}
        >
          Adicionar
        </button>
      }
    >
      <select className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)}>
        {disponiveis.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
    </Modal>
  );
}

function NovaTurmaDialog({
  sugestaoNome,
  professores,
  onClose,
  onSubmit,
}: {
  sugestaoNome: string;
  professores: Professor[];
  onClose: () => void;
  onSubmit: (t: {
    horario: string;
    nome: string;
    professor: string;
    professorId?: string;
    sala: string;
    limite: number;
  }) => { ok: boolean; erro?: string };
}) {
  const [form, setForm] = useState({
    horario: "00:00",
    nome: sugestaoNome,
    professorId: "",
    sala: "",
    limite: "15",
  });
  const [erro, setErro] = useState<string | null>(null);
  const inicial = {
    horario: "00:00",
    nome: sugestaoNome,
    professorId: "",
    sala: "",
    limite: "15",
  };

  const salvar = () => {
    const prof = professores.find((p) => p.id === form.professorId);
    const payload: {
      horario: string;
      nome: string;
      professor: string;
      sala: string;
      limite: number;
      professorId?: string;
    } = {
      horario: form.horario || "00:00",
      nome: form.nome.trim(),
      professor: prof ? prof.nome : "A definir",
      sala: form.sala.trim(),
      limite: Number(form.limite),
    };
    if (prof) payload.professorId = prof.id;
    const r = onSubmit(payload);
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível criar a turma.");
      return false;
    }
    return true;
  };
  const descartar = () => setForm(inicial);
  useRascunhoForm("nova-turma", form, inicial, salvar, descartar);

  return (
    <Modal
      titulo="Adicionar horário"
      descricao="É permitido repetir dia e horário desde que a sala seja diferente."
      erro={erro}
      onClose={onClose}
      footer={
        <button
          className={btnPrimary}
          type="button"
          onClick={() => {
            if (salvar()) onClose();
          }}
        >
          Criar turma
        </button>
      }
    >
      <HoraInput
        className={inputCls}
        value={form.horario}
        onChange={(v) => setForm({ ...form, horario: v })}
      />
      <input
        className={inputCls}
        placeholder="Nome da turma"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
      />
      <select
        className={inputCls}
        value={form.professorId}
        onChange={(e) => setForm({ ...form, professorId: e.target.value })}
      >
        <option value="">A definir</option>
        {professores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nome}
          </option>
        ))}
      </select>
      {professores.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground">
          Nenhum professor vinculado a {sugestaoNome} no momento. Cadastre um na aba Professores
          para selecioná-lo aqui.
        </p>
      )}
      <input
        className={inputCls}
        placeholder="Sala / local da aula"
        value={form.sala}
        onChange={(e) => setForm({ ...form, sala: e.target.value })}
      />
      <input
        className={inputCls}
        type="number"
        min={1}
        placeholder="Limite de vagas"
        value={form.limite}
        onChange={(e) => setForm({ ...form, limite: e.target.value })}
      />
    </Modal>
  );
}
