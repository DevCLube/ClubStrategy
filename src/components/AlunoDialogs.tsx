import { useId, useMemo, useState, type ReactNode } from "react";
import type { Categoria } from "@/lib/mock-data";
import { useStore, type Local, type Resultado } from "@/lib/store";
import { useAviso } from "@/components/Avisos";
import { useRascunhoForm } from "@/lib/rascunho";

export const btnPrimary =
  "inline-flex items-center gap-1.5 rounded border border-transparent bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-dark disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center gap-1.5 rounded border border-border bg-transparent px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-200 hover:bg-secondary";
export const inputCls =
  "h-9 w-full rounded-md border border-border bg-card px-2.5 text-sm text-foreground outline-none focus:border-primary";

export function Modal({
  titulo,
  descricao,
  erro,
  onClose,
  children,
  footer,
  wide,
}: {
  titulo: string;
  descricao?: string;
  erro?: string | null;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
    >
      <div
        className={`max-h-[90vh] w-full ${wide ? "max-w-xl" : "max-w-md"} overflow-auto rounded-lg border border-border bg-card p-5 shadow-lg`}
      >
        <h3 className="text-base font-bold text-foreground">{titulo}</h3>
        {descricao && <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>}
        {erro && (
          <p className="mt-3 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
            {erro}
          </p>
        )}
        <div className="mt-4 space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          {footer}
          <button className={btnGhost} onClick={onClose} type="button">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- cadastro / edição de aluno ---------- */

export function AlunoFormDialog({
  titulo,
  descricao,
  inicial,
  comData,
  labelData,
  onClose,
  onSubmit,
}: {
  titulo: string;
  descricao?: string;
  inicial?: { nome: string; matricula: string; idade: number };
  comData: boolean;
  labelData?: string;
  onClose: () => void;
  onSubmit: (dados: { nome: string; matricula: string; idade: number; data: string }) => Resultado;
}) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [matricula, setMatricula] = useState(inicial?.matricula ?? "");
  const [idade, setIdade] = useState(inicial ? String(inicial.idade) : "");
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  const key = useId();

  const form = { nome, matricula, idade, data };
  const inicialForm = {
    nome: inicial?.nome ?? "",
    matricula: inicial?.matricula ?? "",
    idade: inicial ? String(inicial.idade) : "",
    data: hoje,
  };
  const salvar = () => {
    const r = onSubmit({ nome, matricula, idade: Number(idade), data: comData ? data : hoje });
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível salvar.");
      return false;
    }
    return true;
  };
  const descartar = () => {
    setNome(inicial?.nome ?? "");
    setMatricula(inicial?.matricula ?? "");
    setIdade(inicial ? String(inicial.idade) : "");
    setData(hoje);
    setErro(null);
  };
  useRascunhoForm(`aluno-form-${key}`, form, inicialForm, salvar, descartar);

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
          Salvar
        </button>
      }
    >
      <input
        className={inputCls}
        maxLength={100}
        placeholder="Nome completo"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <input
        className={inputCls}
        maxLength={20}
        placeholder="Número de matrícula"
        value={matricula}
        onChange={(e) => setMatricula(e.target.value)}
      />
      <input
        className={inputCls}
        type="number"
        min={1}
        max={120}
        placeholder="Idade"
        value={idade}
        onChange={(e) => setIdade(e.target.value)}
      />
      {comData && (
        <label className="block text-xs font-medium text-muted-foreground">
          {labelData ?? "Data de matrícula"}
          <input
            className={`${inputCls} mt-1`}
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </label>
      )}
    </Modal>
  );
}

/* ---------- selecionar aluno já cadastrado ---------- */

export function SelecionarCadastroDialog({
  titulo,
  labelData,
  onClose,
  onSubmit,
}: {
  titulo: string;
  labelData: string;
  onClose: () => void;
  onSubmit: (cadastroId: string, data: string) => Resultado;
}) {
  const { cadastros } = useStore();
  const hoje = new Date().toISOString().slice(0, 10);
  const [busca, setBusca] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  const key = useId();

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const base = [...cadastros].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (!q) return base.slice(0, 40);
    return base.filter((c) => `${c.nome} ${c.matricula}`.toLowerCase().includes(q)).slice(0, 40);
  }, [cadastros, busca]);

  const form = { busca, sel, data };
  const inicial = { busca: "", sel: null as string | null, data: hoje };
  const salvar = () => {
    if (!sel) return false;
    const r = onSubmit(sel, data);
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível vincular o aluno.");
      return false;
    }
    return true;
  };
  const descartar = () => {
    setBusca("");
    setSel(null);
    setData(hoje);
    setErro(null);
  };
  useRascunhoForm(`selecionar-cadastro-${key}`, form, inicial, salvar, descartar);

  return (
    <Modal
      titulo={titulo}
      descricao="Busque na base geral de alunos do clube por nome ou matrícula."
      erro={erro}
      onClose={onClose}
      footer={
        <button
          className={btnPrimary}
          type="button"
          disabled={!sel}
          onClick={() => {
            if (salvar()) onClose();
          }}
        >
          Vincular à turma
        </button>
      }
    >
      <input
        className={inputCls}
        placeholder="Buscar por nome ou matrícula"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <ul className="max-h-56 space-y-1 overflow-auto rounded-md border border-border p-1">
        {lista.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setSel(c.id)}
              className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                sel === c.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
              }`}
            >
              <span className="truncate font-medium">{c.nome}</span>
              <span className="shrink-0 text-xs opacity-80">
                Mat. {c.matricula} · {c.idade} anos
              </span>
            </button>
          </li>
        ))}
        {lista.length === 0 && (
          <li className="px-2 py-4 text-center text-xs text-muted-foreground">
            Nenhum aluno cadastrado encontrado.
          </li>
        )}
      </ul>
      <label className="block text-xs font-medium text-muted-foreground">
        {labelData}
        <input
          className={`${inputCls} mt-1`}
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </label>
    </Modal>
  );
}

/* ---------- seleção de turma (destino) ---------- */

export function SeletorTurma({
  categorias,
  value,
  onChange,
}: {
  categorias: Categoria[];
  value: Partial<Local>;
  onChange: (v: Partial<Local>) => void;
}) {
  const cat = categorias.find((c) => c.id === value.catId);
  const dia = cat?.dias.find((d) => d.id === value.diaId);

  return (
    <>
      <label className="block text-xs font-medium text-muted-foreground">
        Modalidade
        <select
          className={`${inputCls} mt-1`}
          value={value.catId ?? ""}
          onChange={(e) => onChange({ catId: e.target.value })}
        >
          <option value="">Selecione…</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Dia
        <select
          className={`${inputCls} mt-1`}
          value={value.diaId ?? ""}
          disabled={!cat}
          onChange={(e) => onChange({ catId: value.catId ?? "", diaId: e.target.value })}
        >
          <option value="">Selecione…</option>
          {(cat?.dias ?? []).map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        Horário / turma
        <select
          className={`${inputCls} mt-1`}
          value={value.turmaId ?? ""}
          disabled={!dia}
          onChange={(e) =>
            onChange({
              catId: value.catId ?? "",
              diaId: value.diaId ?? "",
              turmaId: e.target.value,
            })
          }
        >
          <option value="">Selecione…</option>
          {(dia?.turmas ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.horario} · {t.nome} · {t.sala} ({t.matriculados.length}/{t.limite})
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

export function TransferirDialog({
  aluno,
  listaOrigem,
  onClose,
  onSubmit,
}: {
  aluno: { nome: string };
  listaOrigem: "matriculados" | "espera";
  onClose: () => void;
  onSubmit: (destino: Local) => Resultado;
}) {
  const { categorias } = useStore();
  const [destino, setDestino] = useState<Partial<Local>>({});
  const [erro, setErro] = useState<string | null>(null);
  const { confirmar, avisar } = useAviso();
  const key = useId();
  const completo = Boolean(destino.catId && destino.diaId && destino.turmaId);

  const form = destino;
  const inicial = {} as Partial<Local>;
  const salvar = () => true;
  const descartar = () => setDestino({});
  useRascunhoForm(`transferir-${key}`, form, inicial, salvar, descartar);

  const preview = async () => {
    if (!completo) return;
    const d = destino as Local;
    const cat = categorias.find((c) => c.id === d.catId);
    const dia = cat?.dias.find((x) => x.id === d.diaId);
    const turmaDestino = dia?.turmas.find((t) => t.id === d.turmaId);
    if (!turmaDestino) return;

    const lotada = turmaDestino.matriculados.length >= turmaDestino.limite;
    const posicao = lotada ? turmaDestino.espera.length + 1 : undefined;
    const titulo = lotada ? "Transferir para lista de espera" : "Confirmar transferência";
    const mensagem = lotada
      ? `${turmaDestino.nome} (${turmaDestino.horario}) está lotada. ${aluno.nome} entrará na lista de espera na ${posicao}ª posição.`
      : `${aluno.nome} será matriculado em ${turmaDestino.nome} (${turmaDestino.horario}, ${turmaDestino.sala}).`;

    if (
      await confirmar({
        titulo,
        mensagem,
        confirmarLabel: "Confirmar transferência",
        cancelarLabel: "Cancelar",
      })
    ) {
      const r = onSubmit(d);
      if (!r.ok) {
        setErro(r.erro ?? "Não foi possível transferir.");
        await avisar({
          titulo: "Erro na transferência",
          mensagem: r.erro ?? "Erro inesperado.",
          perigo: true,
        });
      } else {
        onClose();
      }
    }
  };

  return (
    <Modal
      titulo={`Transferir ${aluno.nome}`}
      descricao="O aluno entra como matriculado se houver vaga; caso contrário, entra na lista de espera do destino."
      erro={erro}
      onClose={onClose}
      footer={
        <button className={btnPrimary} type="button" disabled={!completo} onClick={preview}>
          Transferir
        </button>
      }
    >
      <SeletorTurma categorias={categorias} value={destino} onChange={setDestino} />
      {listaOrigem === "espera" && (
        <p className="text-xs text-muted-foreground">
          O aluno está na lista de espera da turma de origem. Ao transferir, ele perde a posição
          atual e entra no final da fila do destino se este estiver lotado.
        </p>
      )}
    </Modal>
  );
}
