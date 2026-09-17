import { createFileRoute } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import {
  ChevronDown,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Unlink,
  UserRound,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Modal, SeletorTurma, btnGhost, btnPrimary, inputCls } from "@/components/AlunoDialogs";
import { useAviso } from "@/components/Avisos";
import { useRascunhoForm } from "@/lib/rascunho";
import { aulasDeProfessor, type AulaDoProfessor } from "@/lib/derive";
import { iconeDe } from "@/lib/icones";
import type { Professor } from "@/lib/mock-data";
import { useAcoes, useStore, type Local } from "@/lib/store";

export const Route = createFileRoute("/professores")({
  head: () => ({
    meta: [
      { title: "Professores — ClubStrategy | Clube Pirassununga" },
      {
        name: "description",
        content:
          "Cadastre os professores do clube, vincule modalidades e acompanhe as aulas em que cada um está alocado.",
      },
      { property: "og:title", content: "Professores — ClubStrategy" },
      {
        property: "og:description",
        content: "Cadastro de professores, modalidades e alocação em turmas do Clube Pirassununga.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfessoresPage,
});

function ProfessoresPage() {
  const { professores, categorias } = useStore();
  const { addProfessor, updateProfessor, removeProfessor, updateTurma } = useAcoes();
  const { confirmar } = useAviso();
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState<Professor | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);
  const [vincular, setVincular] = useState<Professor | null>(null);

  const aulasPorProf = useMemo(() => aulasDeProfessor(categorias), [categorias]);

  const nomeModalidade = (id: string) => categorias.find((c) => c.id === id)?.nome ?? id;

  const desvincular = async (p: Professor, a: AulaDoProfessor) => {
    const ir = await confirmar({
      titulo: `Desvincular ${p.nome} da aula?`,
      mensagem: `A aula de ${a.categoria} · ${a.dia} ${a.horario} (${a.turma}) ficará sem professor.`,
      confirmarLabel: "Desvincular",
      perigo: true,
    });
    if (!ir) return;
    const r = updateTurma(a.categoriaId, a.diaId, a.turmaId, {
      professor: "A definir",
      professorId: undefined,
    });
    if (!r.ok) {
      toast.error(r.erro ?? "Não foi possível desvincular o professor.");
      return;
    }
    toast.success(`${p.nome} desvinculado da aula.`);
  };

  const excluir = async (p: Professor) => {
    const aulas = aulasPorProf.get(p.id) ?? [];
    const base =
      aulas.length === 0
        ? `O professor "${p.nome}" será removido do sistema.`
        : `O professor "${p.nome}" está alocado em ${aulas.length} aula(s). Elas ficarão sem professor.`;
    const ir = await confirmar({
      titulo: `Excluir ${p.nome}?`,
      mensagem: base,
      confirmarLabel: "Excluir professor",
      perigo: true,
    });
    if (!ir) return;
    const r = removeProfessor(p.id);
    if (!r.ok) {
      toast.error(r.erro ?? "Não foi possível excluir o professor.");
      return;
    }
    toast.success(`Professor "${p.nome}" excluído.`);
    if (aberto === p.id) setAberto(null);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Professores</h1>
          <p className="text-sm text-muted-foreground">
            Cadastre professores, vincule modalidades que eles podem ministrar e veja as aulas em
            que estão alocados.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
          onClick={() => setNovo(true)}
        >
          <Plus className="h-4 w-4" /> Novo professor
        </button>
      </header>

      {professores.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center">
          <GraduationCap className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-semibold text-foreground">
            Nenhum professor cadastrado ainda.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Cadastre o primeiro professor ou escolha um na criação de uma aula para ele aparecer
            aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          {professores.map((p) => {
            const aulas = aulasPorProf.get(p.id) ?? [];
            const expandido = aberto === p.id;
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)] transition-colors hover:border-primary/40"
              >
                <button
                  className="flex w-full items-center gap-3 p-4 text-left"
                  onClick={() => setAberto(expandido ? null : p.id)}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {p.nome}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {p.modalidadeIds.length === 0
                        ? "Sem modalidades vinculadas"
                        : `${p.modalidadeIds.length} modalidade(s)`}
                      {aulas.length > 0 && ` · ${aulas.length} aula(s)`}
                    </span>
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                      expandido ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {p.modalidadeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    {p.modalidadeIds.map((id) => {
                      const Icon = iconeDe(categorias.find((c) => c.id === id)?.icone ?? "");
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground"
                        >
                          <Icon className="h-3 w-3" />
                          {nomeModalidade(id)}
                        </span>
                      );
                    })}
                  </div>
                )}

                {expandido && (
                  <div className="border-t border-border bg-background/50 p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {p.modalidadeIds.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Nenhuma modalidade vinculada — cadastre modalidades para ele aparecer no
                          seletor de aulas.
                        </span>
                      ) : (
                        p.modalidadeIds.map((id) => {
                          const Icon = iconeDe(categorias.find((c) => c.id === id)?.icone ?? "");
                          return (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-full bg-accent/40 px-2.5 py-0.5 text-[11px] font-semibold text-accent-foreground"
                            >
                              <Icon className="h-3 w-3" />
                              {nomeModalidade(id)}
                            </span>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Aulas em que está alocado
                        {aulas.length > 0 && (
                          <span className="ml-1.5 text-muted-foreground">{aulas.length}</span>
                        )}
                      </p>
                      <button className={btnPrimary} onClick={() => setVincular(p)}>
                        <UserPlus className="h-3.5 w-3.5" /> Vincular aula
                      </button>
                    </div>
                    {aulas.length === 0 ? (
                      <p className="mt-2 rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
                        Nenhuma aula vinculada no momento.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {aulas.map((a) => (
                          <li
                            key={a.turmaId}
                            className="flex items-start justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {a.categoria} · {a.horario}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground">
                                {a.dia} · {a.turma} · {a.sala}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  a.matriculados >= a.limite
                                    ? "bg-accent text-accent-foreground"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {a.matriculados}/{a.limite}
                              </span>
                              <button
                                aria-label={`Desvincular de ${a.turma}`}
                                title="Desvincular desta aula"
                                className="text-muted-foreground transition-colors hover:text-primary"
                                onClick={() => desvincular(p, a)}
                              >
                                <Unlink className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-1.5 border-t border-border bg-card px-3 py-2">
                  <button className={btnGhost} onClick={() => setEditando(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button className={btnGhost} onClick={() => excluir(p)}>
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {novo && (
        <ProfessorFormDialog
          titulo="Cadastrar professor"
          descricao="Informe o nome e as modalidades que ele pode ministrar."
          onClose={() => setNovo(false)}
          onSubmit={(nome, modalidadeIds) => addProfessor(nome, modalidadeIds)}
        />
      )}

      {editando && (
        <ProfessorFormDialog
          titulo={`Editar ${editando.nome}`}
          descricao="As aulas em que ele está alocado acompanham a alteração do nome."
          inicial={editando}
          onClose={() => setEditando(null)}
          onSubmit={(nome, modalidadeIds) => updateProfessor(editando.id, nome, modalidadeIds)}
        />
      )}

      {vincular && <VincularAulaDialog professor={vincular} onClose={() => setVincular(null)} />}
    </div>
  );
}

function ProfessorFormDialog({
  titulo,
  descricao,
  inicial,
  onClose,
  onSubmit,
}: {
  titulo: string;
  descricao?: string;
  inicial?: Professor;
  onClose: () => void;
  onSubmit: (nome: string, modalidadeIds: string[]) => { ok: boolean; erro?: string };
}) {
  const { categorias } = useStore();
  const key = useId();
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [modalidadeIds, setModalidadeIds] = useState<string[]>(inicial?.modalidadeIds ?? []);
  const [erro, setErro] = useState<string | null>(null);

  const inicialVal = { nome: inicial?.nome ?? "", modalidadeIds: inicial?.modalidadeIds ?? [] };
  const form = { nome, modalidadeIds };

  const toggle = (id: string) =>
    setModalidadeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const salvar = () => {
    const r = onSubmit(nome, modalidadeIds);
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível salvar o professor.");
      return false;
    }
    toast.success(inicial ? "Professor atualizado." : "Professor cadastrado.");
    return true;
  };
  const descartar = () => {
    setNome(inicial?.nome ?? "");
    setModalidadeIds(inicial?.modalidadeIds ?? []);
    setErro(null);
  };
  useRascunhoForm(`professor-${key}`, form, inicialVal, salvar, descartar);

  return (
    <Modal
      titulo={titulo}
      {...(descricao ? { descricao } : {})}
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
          Salvar professor
        </button>
      }
    >
      <label className="block text-xs font-medium text-muted-foreground">
        Nome do Professor
        <input
          className={`${inputCls} mt-1`}
          maxLength={100}
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex: João Marcelo"
        />
      </label>
      <div className="block">
        <p className="text-xs font-medium text-muted-foreground">Modalidades que pode ministrar</p>
        {categorias.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Nenhuma modalidade cadastrada no sistema.
          </p>
        ) : (
          <div className="mt-2 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto">
            {categorias.map((c) => {
              const Icon = iconeDe(c.icone);
              const ativa = modalidadeIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggle(c.id)}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                    ativa
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{c.nome}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

function VincularAulaDialog({ professor, onClose }: { professor: Professor; onClose: () => void }) {
  const { categorias } = useStore();
  const { updateTurma } = useAcoes();
  const { confirmar } = useAviso();
  const key = useId();
  const [destino, setDestino] = useState<Partial<Local>>({});
  const [erro, setErro] = useState<string | null>(null);

  const categoriasFiltradas = categorias.filter((c) => professor.modalidadeIds.includes(c.id));
  const completo = Boolean(destino.catId && destino.diaId && destino.turmaId);

  const inicial = { destino: {} as Partial<Local> };
  const form = { destino };

  /** Executa o vínculo. Retorna "precisaConfirmar" quando a aula já tem outro professor. */
  const vincular = (
    substituir: boolean,
  ): { ok: boolean; ja?: boolean; precisaConfirmar?: boolean; erro?: string } => {
    if (!completo) return { ok: false, erro: "Escolha a modalidade, o dia e o horário da aula." };
    const local = destino as Local;
    const cat = categorias.find((c) => c.id === local.catId);
    const dia = cat?.dias.find((d) => d.id === local.diaId);
    const turma = dia?.turmas.find((t) => t.id === local.turmaId);
    if (!turma) return { ok: false, erro: "A aula selecionada não foi encontrada." };

    if (turma.professorId === professor.id) return { ok: true, ja: true };
    if (turma.professorId && !substituir) return { ok: false, precisaConfirmar: true };

    const r = updateTurma(local.catId, local.diaId, local.turmaId, {
      professor: professor.nome,
      professorId: professor.id,
    });
    if (!r.ok) return { ok: false, erro: r.erro ?? "Não foi possível vincular o professor." };
    return { ok: true };
  };

  const salvar = (): boolean => {
    const r = vincular(false);
    if (r.precisaConfirmar) {
      setErro(
        "Esta aula já tem outro professor. Use o botão Vincular para confirmar a substituição.",
      );
      return false;
    }
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível vincular o professor.");
      return false;
    }
    return true;
  };
  const descartar = () => {
    setDestino({});
    setErro(null);
  };
  useRascunhoForm(`vincular-${key}`, form, inicial, salvar, descartar);

  const confirmarESalvar = async () => {
    const antes = categorias;
    const local = destino as Partial<Local>;
    const turmaAntes = antes
      .find((c) => c.id === local.catId)
      ?.dias.find((d) => d.id === local.diaId)
      ?.turmas.find((t) => t.id === local.turmaId);
    const jaAlocado = turmaAntes?.professorId === professor.id;

    let r = vincular(false);
    if (r.precisaConfirmar) {
      const cat = antes.find((c) => c.id === local.catId);
      const dia = cat?.dias.find((d) => d.id === local.diaId);
      const turma = dia?.turmas.find((t) => t.id === local.turmaId);
      const ir = await confirmar({
        titulo: "Substituir professor?",
        mensagem: `A aula de ${cat?.nome ?? ""} · ${dia?.nome ?? ""} ${turma?.horario ?? ""} (${turma?.nome ?? ""}) já tem "${turma?.professor}". Deseja substituir por ${professor.nome}?`,
        confirmarLabel: "Substituir",
        perigo: true,
      });
      if (!ir) return;
      r = vincular(true);
    }

    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível vincular o professor.");
      return;
    }
    if (r.ja || jaAlocado) toast.info(`${professor.nome} já está alocado nessa aula.`);
    else toast.success(`${professor.nome} vinculado à aula.`);
    onClose();
  };

  return (
    <Modal
      titulo={`Vincular ${professor.nome} a uma aula`}
      descricao="Escolha entre as modalidades do professor para alocá-lo em um horário."
      erro={erro}
      onClose={onClose}
      footer={
        <button
          className={btnPrimary}
          type="button"
          disabled={!completo}
          onClick={confirmarESalvar}
        >
          Vincular
        </button>
      }
    >
      {categoriasFiltradas.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          {professor.nome} não tem modalidades vinculadas. Edite o professor e selecione as
          modalidades que ele pode ministrar primeiro.
        </p>
      ) : (
        <SeletorTurma categorias={categoriasFiltradas} value={destino} onChange={setDestino} />
      )}
    </Modal>
  );
}
