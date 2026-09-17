import { memo, useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  Trash2,
  ArrowUpCircle,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ArrowLeftRight,
  UserPlus,
  Users,
} from "lucide-react";
import { formatDate, type Aluno, type Professor, type Turma } from "@/lib/mock-data";
import { normalizarHora } from "@/components/HoraInput";
import { useAcoes, type Lista, type Local } from "@/lib/store";
import { useAviso } from "@/components/Avisos";
import { HoraInput } from "@/components/HoraInput";
import { useRascunhoForm } from "@/lib/rascunho";
import {
  AlunoFormDialog,
  Modal,
  SelecionarCadastroDialog,
  TransferirDialog,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/AlunoDialogs";

type Props = {
  catId: string;
  diaId: string;
  turma: Turma;
  minimizado: boolean;
  onAlternar: (turmaId: string) => void;
  professores: Professor[];
};

type DialogState =
  | { tipo: "escolher"; lista: Lista }
  | { tipo: "novo"; lista: Lista }
  | { tipo: "existente"; lista: Lista }
  | { tipo: "transferir"; aluno: Aluno; lista: Lista }
  | null;

export const TurmaColuna = memo(function TurmaColuna({
  catId,
  diaId,
  turma,
  minimizado,
  onAlternar,
  professores,
}: Props) {
  const {
    updateTurma,
    removeTurma,
    addAlunoNovo,
    addAlunoExistente,
    removerAlunos,
    promover,
    transferir,
  } = useAcoes();
  const { avisar, confirmar } = useAviso();
  const local: Local = { catId, diaId, turmaId: turma.id };

  const [editando, setEditando] = useState(false);
  const [erroTurma, setErroTurma] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: turma.nome,
    professorId: turma.professorId ?? "",
    sala: turma.sala,
    limite: String(turma.limite),
    horario: normalizarHora(turma.horario || "00:00"),
  });
  const [verEspera, setVerEspera] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [sel, setSel] = useState<Record<Lista, string[]>>({ matriculados: [], espera: [] });

  const lotada = turma.matriculados.length >= turma.limite;

  const professoresDoCat = professores.filter((p) => p.modalidadeIds.includes(catId));
  const professorAtual = professores.find((p) => p.id === turma.professorId);
  const opcoesProf = [...professoresDoCat];
  if (professorAtual && !opcoesProf.some((p) => p.id === professorAtual.id))
    opcoesProf.push(professorAtual);
  opcoesProf.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  useEffect(() => {
    if (!editando) {
      setForm({
        nome: turma.nome,
        professorId: turma.professorId ?? "",
        sala: turma.sala,
        limite: String(turma.limite),
        horario: normalizarHora(turma.horario || "00:00"),
      });
      setErroTurma(null);
    }
  }, [editando, turma]);

  const inicial = {
    nome: turma.nome,
    professorId: turma.professorId ?? "",
    sala: turma.sala,
    limite: String(turma.limite),
    horario: normalizarHora(turma.horario || "00:00"),
  };
  const salvarTurma = () => {
    const prof = professores.find((p) => p.id === form.professorId);
    const r = updateTurma(catId, diaId, turma.id, {
      nome: form.nome,
      professor: prof ? prof.nome : "A definir",
      professorId: prof?.id,
      sala: form.sala,
      horario: form.horario,
      limite: Number(form.limite),
    });
    if (!r.ok) {
      setErroTurma(r.erro ?? null);
      return false;
    }
    setErroTurma(null);
    setEditando(false);
    return true;
  };
  const descartarTurma = () => {
    setForm(inicial);
    setErroTurma(null);
    setEditando(false);
  };
  useRascunhoForm(`turma-${turma.id}`, form, inicial, salvarTurma, descartarTurma);

  const toggle = (lista: Lista, id: string) =>
    setSel((s) => ({
      ...s,
      [lista]: s[lista].includes(id) ? s[lista].filter((x) => x !== id) : [...s[lista], id],
    }));

  const toggleTodos = (lista: Lista) =>
    setSel((s) => ({
      ...s,
      [lista]: s[lista].length === turma[lista].length ? [] : turma[lista].map((a) => a.id),
    }));

  const notificar = async (r: { ok: boolean; erro?: string }) => {
    if (!r.ok)
      await avisar({
        titulo: "Não foi possível concluir",
        mensagem: r.erro ?? "Erro inesperado.",
        perigo: true,
      });
  };

  const eliminarTurma = async () => {
    const total = turma.matriculados.length + turma.espera.length;
    if (total > 0) {
      await avisar({
        titulo: `Não é possível excluir ${turma.horario}`,
        mensagem: `Este horário tem ${turma.matriculados.length} matriculado(s) e ${turma.espera.length} na lista de espera. Remova os alunos antes de excluir.`,
        perigo: true,
      });
      return;
    }
    if (
      await confirmar({
        titulo: `Excluir ${turma.horario}?`,
        mensagem: `A turma "${turma.nome}" será removida permanentemente.`,
        confirmarLabel: "Excluir",
        perigo: true,
      })
    ) {
      await notificar(removeTurma(catId, diaId, turma.id));
    }
  };

  const removerSelecionados = async (lista: Lista) => {
    const ids = sel[lista];
    if (ids.length === 0) return;
    const rotulo = lista === "espera" ? "da lista de espera" : "dos matriculados";
    if (
      await confirmar({
        titulo: `Remover ${ids.length} aluno(s)?`,
        mensagem: `Os registros serão removidos da turma e enviados para o histórico.`,
        confirmarLabel: "Remover",
        cancelarLabel: "Cancelar",
        perigo: true,
      })
    ) {
      const r = removerAlunos(local, lista, ids);
      await notificar(r);
      if (r.ok) setSel((s) => ({ ...s, [lista]: [] }));
    }
  };

  const abrirAdicionar = (lista: Lista) => {
    setDialog({ tipo: "escolher", lista });
  };

  const rootCls = minimizado
    ? "flex w-80 shrink-0 flex-col rounded-lg border border-border bg-card shadow-[var(--shadow-card)]"
    : "flex w-80 shrink-0 flex-col rounded-lg border border-primary bg-card shadow-[0_0_0_1px_var(--primary),0_0_12px_rgba(211,47,47,0.15)]";

  return (
    <div className={rootCls}>
      {minimizado ? (
        <div
          role="button"
          tabIndex={0}
          className="cursor-pointer p-3 transition-colors hover:bg-secondary"
          onClick={() => onAlternar(turma.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onAlternar(turma.id);
            }
          }}
        >
          <div className="flex w-full items-start gap-2 text-left">
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground">{turma.horario}</p>
              <p className="truncate text-sm font-semibold text-foreground">{turma.nome}</p>
              <p className="truncate text-xs text-muted-foreground">
                Professor(a): {turma.professor}
              </p>
              <p className="truncate text-xs text-muted-foreground">Sala: {turma.sala}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <div className="flex flex-wrap items-center justify-end gap-1">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    turma.matriculados.length > turma.limite
                      ? "bg-destructive/15 text-destructive border border-destructive/30"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {turma.matriculados.length}/{turma.limite}
                </span>
                {turma.espera.length > 0 && (
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                    {turma.espera.length} na espera
                  </span>
                )}
              </div>
              <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  aria-label="Editar turma"
                  className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                  onClick={() => {
                    onAlternar(turma.id);
                    setEditando(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  aria-label="Excluir horário"
                  title="Excluir horário/turma"
                  className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                  onClick={() => eliminarTurma()}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-border bg-primary/[0.06] p-3">
            {editando ? (
              <div className="space-y-2">
                {erroTurma && (
                  <p className="rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5 text-[11px] font-medium text-primary">
                    {erroTurma}
                  </p>
                )}
                <HoraInput
                  className={inputCls}
                  value={form.horario}
                  onChange={(v) => setForm({ ...form, horario: v })}
                />
                <input
                  className={inputCls}
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome da turma"
                />
                <select
                  className={inputCls}
                  value={form.professorId}
                  onChange={(e) => setForm({ ...form, professorId: e.target.value })}
                >
                  <option value="">A definir</option>
                  {opcoesProf.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <input
                  className={inputCls}
                  value={form.sala}
                  onChange={(e) => setForm({ ...form, sala: e.target.value })}
                  placeholder="Sala / local da aula"
                />
                <input
                  type="number"
                  min={1}
                  className={inputCls}
                  value={form.limite}
                  onChange={(e) => setForm({ ...form, limite: e.target.value })}
                  placeholder="Limite de vagas"
                />
                <div className="flex gap-2">
                  <button className={btnPrimary} onClick={() => salvarTurma()}>
                    <Check className="h-3.5 w-3.5" /> Salvar
                  </button>
                  <button
                    className={btnGhost}
                    onClick={() => {
                      descartarTurma();
                    }}
                  >
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground">{turma.horario}</p>
                    <p className="text-sm font-semibold text-foreground">{turma.nome}</p>
                    <p className="text-xs text-muted-foreground">Professor(a): {turma.professor}</p>
                    <p className="text-xs text-muted-foreground">Sala: {turma.sala}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      aria-label="Minimizar horário"
                      title="Minimizar horário"
                      className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                      onClick={() => {
                        onAlternar(turma.id);
                        setEditando(false);
                      }}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="Editar turma"
                      className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary"
                      onClick={() => setEditando(true)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      aria-label="Excluir horário"
                      title="Excluir horário/turma"
                      className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                      onClick={() => eliminarTurma()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      turma.matriculados.length > turma.limite
                        ? "bg-destructive/15 text-destructive border border-destructive/30"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {turma.matriculados.length}/{turma.limite}
                  </span>
                  {turma.matriculados.length > turma.limite ? (
                    <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                      Sobrelotação
                    </span>
                  ) : lotada ? (
                    <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                      Turma lotada
                    </span>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <div className="flex-1 space-y-2 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Matriculados
              </p>
              {turma.matriculados.length > 0 && (
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <input
                    type="checkbox"
                    className="accent-[hsl(var(--primary))]"
                    checked={sel.matriculados.length === turma.matriculados.length}
                    onChange={() => toggleTodos("matriculados")}
                  />
                  Selecionar todos
                </label>
              )}
            </div>

            {turma.matriculados.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">Nenhum aluno matriculado.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {turma.matriculados.map((a) => (
                  <AlunoLinha
                    key={a.id}
                    aluno={a}
                    checked={sel.matriculados.includes(a.id)}
                    onCheck={() => toggle("matriculados", a.id)}
                    info={`Mat. ${a.matricula} · ${a.idade} anos · ${formatDate(a.dataMatricula)}`}
                    onTransferir={() =>
                      setDialog({ tipo: "transferir", aluno: a, lista: "matriculados" })
                    }
                    onRemover={async () => {
                      if (
                        await confirmar({
                          titulo: `Remover ${a.nome}?`,
                          mensagem: "O registro será removido da turma e enviado para o histórico.",
                          confirmarLabel: "Remover",
                          perigo: true,
                        })
                      ) {
                        await notificar(removerAlunos(local, "matriculados", [a.id]));
                      }
                    }}
                  />
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-2">
              <button className={btnPrimary} onClick={() => abrirAdicionar("matriculados")}>
                <Plus className="h-3.5 w-3.5" /> Adicionar aluno
              </button>
              {sel.matriculados.length > 0 && (
                <button className={btnGhost} onClick={() => removerSelecionados("matriculados")}>
                  <Trash2 className="h-3.5 w-3.5" /> Remover selecionados ({sel.matriculados.length}
                  )
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-border p-3">
            <button
              className={`${btnGhost} w-full justify-center`}
              onClick={() => setVerEspera((v) => !v)}
            >
              {verEspera
                ? "Ocultar lista de espera"
                : `Ver lista de espera (${turma.espera.length})`}
            </button>

            {verEspera && (
              <div className="mt-3 space-y-2">
                {turma.espera.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Ninguém na lista de espera.</p>
                ) : (
                  <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <input
                      type="checkbox"
                      className="accent-[hsl(var(--primary))]"
                      checked={sel.espera.length === turma.espera.length}
                      onChange={() => toggleTodos("espera")}
                    />
                    Selecionar todos
                  </label>
                )}
                <ul className="space-y-1">
                  {turma.espera.map((a, idx) => (
                    <AlunoLinha
                      key={a.id}
                      aluno={a}
                      posicao={idx + 1}
                      checked={sel.espera.includes(a.id)}
                      onCheck={() => toggle("espera", a.id)}
                      info={`Mat. ${a.matricula} · na espera desde ${formatDate(a.dataEspera)}`}
                      onTransferir={() =>
                        setDialog({ tipo: "transferir", aluno: a, lista: "espera" })
                      }
                      onPromover={async () => {
                        if (
                          await confirmar({
                            titulo: `Promover ${a.nome}?`,
                            mensagem:
                              "O aluno será movido da lista de espera para a lista de matriculados.",
                            confirmarLabel: "Promover",
                          })
                        ) {
                          await notificar(promover(catId, diaId, turma.id, a.id));
                        }
                      }}
                      onRemover={async () => {
                        if (
                          await confirmar({
                            titulo: `Remover ${a.nome}?`,
                            mensagem:
                              "O aluno será removido da lista de espera e o registro irá para o histórico.",
                            confirmarLabel: "Remover",
                            perigo: true,
                          })
                        ) {
                          await notificar(removerAlunos(local, "espera", [a.id]));
                        }
                      }}
                    />
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={btnPrimary}
                    onClick={() => setDialog({ tipo: "escolher", lista: "espera" })}
                  >
                    <Plus className="h-3.5 w-3.5" /> Adicionar à espera
                  </button>
                  {sel.espera.length > 0 && (
                    <button className={btnGhost} onClick={() => removerSelecionados("espera")}>
                      <Trash2 className="h-3.5 w-3.5" /> Remover selecionados ({sel.espera.length})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {dialog?.tipo === "escolher" && (
        <Modal
          titulo={
            dialog.lista === "espera"
              ? "Adicionar à lista de espera"
              : "Adicionar aluno matriculado"
          }
          descricao="Escolha entre vincular um aluno já cadastrado no clube ou cadastrar um novo."
          onClose={() => setDialog(null)}
          footer={null}
        >
          <button
            className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-secondary"
            onClick={() => setDialog({ tipo: "existente", lista: dialog.lista })}
          >
            <Users className="h-4 w-4 text-primary" />
            <span>
              <span className="block text-sm font-semibold text-foreground">
                Adicionar aluno já cadastrado
              </span>
              <span className="block text-xs text-muted-foreground">
                Busque na base geral por nome ou matrícula.
              </span>
            </span>
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-secondary"
            onClick={() => setDialog({ tipo: "novo", lista: dialog.lista })}
          >
            <UserPlus className="h-4 w-4 text-primary" />
            <span>
              <span className="block text-sm font-semibold text-foreground">
                Cadastrar novo aluno
              </span>
              <span className="block text-xs text-muted-foreground">
                Ele entra também na base geral do clube.
              </span>
            </span>
          </button>
        </Modal>
      )}

      {dialog?.tipo === "novo" && (
        <AlunoFormDialog
          titulo={
            dialog.lista === "espera" ? "Cadastrar novo aluno na espera" : "Cadastrar novo aluno"
          }
          comData
          labelData={dialog.lista === "espera" ? "Data de entrada na espera" : "Data de matrícula"}
          onClose={() => setDialog(null)}
          onSubmit={(d) => addAlunoNovo(local, dialog.lista, d)}
        />
      )}

      {dialog?.tipo === "existente" && (
        <SelecionarCadastroDialog
          titulo="Adicionar aluno já cadastrado"
          labelData={dialog.lista === "espera" ? "Data de entrada na espera" : "Data de matrícula"}
          onClose={() => setDialog(null)}
          onSubmit={(cadastroId, data) => addAlunoExistente(local, dialog.lista, cadastroId, data)}
        />
      )}

      {dialog?.tipo === "transferir" && (
        <TransferirDialog
          aluno={dialog.aluno}
          listaOrigem={dialog.lista}
          onClose={() => setDialog(null)}
          onSubmit={(destino) =>
            transferir({ ...local, lista: dialog.lista, alunoId: dialog.aluno.id }, destino)
          }
        />
      )}
    </div>
  );
});

function AlunoLinha({
  aluno,
  info,
  posicao,
  checked,
  onCheck,
  onTransferir,
  onRemover,
  onPromover,
}: {
  aluno: Aluno;
  info: string;
  posicao?: number;
  checked: boolean;
  onCheck: () => void;
  onTransferir: () => void;
  onRemover: () => void;
  onPromover?: () => void;
}) {
  return (
    <li className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-secondary">
      <input
        type="checkbox"
        aria-label={`Selecionar ${aluno.nome}`}
        className="mt-1 accent-[hsl(var(--primary))]"
        checked={checked}
        onChange={onCheck}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {posicao !== undefined && (
            <span className="mr-1.5 text-xs text-muted-foreground">{posicao}º</span>
          )}
          {aluno.nome}
        </p>
        <p className="text-[11px] text-muted-foreground">{info}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {onPromover && (
          <button
            aria-label={`Promover ${aluno.nome}`}
            title="Mover para matriculados"
            className="text-muted-foreground transition-colors hover:text-primary"
            onClick={onPromover}
          >
            <ArrowUpCircle className="h-4 w-4" />
          </button>
        )}
        <button
          aria-label={`Transferir ${aluno.nome}`}
          title="Transferir de turma"
          className="text-muted-foreground transition-colors hover:text-primary"
          onClick={onTransferir}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
        </button>
        <button
          aria-label={`Remover ${aluno.nome}`}
          title="Remover"
          className="text-muted-foreground transition-colors hover:text-primary"
          onClick={onRemover}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}
