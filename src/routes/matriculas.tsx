import { createFileRoute } from "@tanstack/react-router";
import { useId, useMemo, useState } from "react";
import { FileSpreadsheet, Pencil, Trash2, UserPlus } from "lucide-react";
import { Filtros, dentroDoPeriodo, filtroVazio } from "@/components/Filtros";
import {
  AlunoFormDialog,
  Modal,
  SeletorTurma,
  btnGhost,
  btnPrimary,
  inputCls,
} from "@/components/AlunoDialogs";
import { useAviso } from "@/components/Avisos";
import { useRascunhoForm } from "@/lib/rascunho";
import { descreverVinculo, vinculosPorCadastro, type Vinculo } from "@/lib/derive";
import { formatDate, type Cadastro } from "@/lib/mock-data";
import { useAcoes, useStore, type Lista, type Local } from "@/lib/store";
import { ExportarRelatorioDialog } from "@/components/ExportarRelatorioDialog";

export const Route = createFileRoute("/matriculas")({
  head: () => ({
    meta: [
      { title: "Matrículas — ClubStrategy | Clube Pirassununga" },
      {
        name: "description",
        content:
          "Matricule, edite e apague alunos da base do clube, com busca por nome, matrícula, idade, período, modalidade e turma.",
      },
      { property: "og:title", content: "Matrículas — ClubStrategy" },
      {
        property: "og:description",
        content:
          "Cadastro, edição e exclusão definitiva de alunos das aulas do Clube Pirassununga.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MatriculasPage,
});

/** Limite a partir do qual a modal de exclusão em massa mostra um resumo agrupado. */
const LIMITE_LISTA = 20;

function MatriculasPage() {
  const { categorias, cadastros } = useStore();
  const { addAlunoNovo, editarAluno, apagarCadastros } = useAcoes();
  const { avisar, confirmar } = useAviso();
  const [filtro, setFiltro] = useState(filtroVazio);
  const [novo, setNovo] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [editando, setEditando] = useState<Cadastro | null>(null);
  const [sel, setSel] = useState<string[]>([]);

  const vinculos = useMemo(() => vinculosPorCadastro(categorias), [categorias]);

  const resultados = useMemo(() => {
    const filtroVinculo = Boolean(filtro.categoria || filtro.turma || filtro.de || filtro.ate);
    return cadastros
      .map((c) => ({ cadastro: c, vinculos: vinculos.get(c.id) ?? [] }))
      .filter(({ cadastro, vinculos: vs }) => {
        if (filtro.nome && !cadastro.nome.toLowerCase().includes(filtro.nome.toLowerCase()))
          return false;
        if (filtro.matricula && !cadastro.matricula.includes(filtro.matricula)) return false;
        if (filtro.idade && cadastro.idade !== Number(filtro.idade)) return false;
        if (!filtroVinculo) return true;
        return vs.some((v) => {
          if (filtro.categoria && v.categoria !== filtro.categoria) return false;
          if (filtro.turma && v.turma !== filtro.turma) return false;
          if (!dentroDoPeriodo(v.data, filtro.de, filtro.ate)) return false;
          return true;
        });
      })
      .sort((a, b) => a.cadastro.nome.localeCompare(b.cadastro.nome, "pt-BR"));
  }, [cadastros, vinculos, filtro]);

  const idsVisiveis = resultados.map((r) => r.cadastro.id);
  const selecionados = sel.filter((id) => idsVisiveis.includes(id));
  const todosMarcados = idsVisiveis.length > 0 && selecionados.length === idsVisiveis.length;

  const toggle = (id: string) =>
    setSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleTodos = () => setSel(todosMarcados ? [] : idsVisiveis);

  const linhasVinculo = (vs: Vinculo[]) => vs.map((v) => `• ${descreverVinculo(v)}`);

  const apagarUm = async (cadastro: Cadastro) => {
    const vs = vinculos.get(cadastro.id) ?? [];
    let titulo: string;
    let linhas: string[] = [];
    if (vs.length === 0) {
      titulo = `Deseja apagar o Aluno "${cadastro.nome}" do sistema?`;
    } else if (vs.length === 1) {
      const v = vs[0]!;
      titulo = `O Aluno "${cadastro.nome}" está ${v.lista === "matriculados" ? "matriculado" : "na lista de espera"}`;
      linhas = [`na aula de ${v.categoria} — ${v.dia} ${v.horario}`];
    } else {
      titulo = `O Aluno "${cadastro.nome}" está matriculado ou na lista de espera em mais de uma aula:`;
      linhas = linhasVinculo(vs);
    }

    const ir = await confirmar({
      titulo,
      ...(linhas.length ? { linhas } : {}),
      ...(vs.length ? { mensagem: "Deseja apagar mesmo assim?" } : {}),
      confirmarLabel: "Confirmar",
      cancelarLabel: "Cancelar",
      perigo: true,
    });
    if (!ir) return;
    const r = apagarCadastros([cadastro.id]);
    if (!r.ok)
      await avisar({ titulo: "Não foi possível apagar", mensagem: r.erro ?? "", perigo: true });
    else setSel((prev) => prev.filter((x) => x !== cadastro.id));
  };

  const apagarSelecionados = async () => {
    if (selecionados.length === 0) return;
    const alvos = resultados.filter((r) => selecionados.includes(r.cadastro.id));
    let linhas: string[];
    if (alvos.length > LIMITE_LISTA) {
      const matriculados = alvos.filter((a) =>
        a.vinculos.some((v) => v.lista === "matriculados"),
      ).length;
      const espera = alvos.filter(
        (a) => a.vinculos.length > 0 && !a.vinculos.some((v) => v.lista === "matriculados"),
      ).length;
      const sem = alvos.filter((a) => a.vinculos.length === 0).length;
      linhas = [
        `${matriculados} matriculado(s) em alguma turma`,
        `${espera} apenas em lista(s) de espera`,
        `${sem} sem vínculo ativo`,
      ];
    } else {
      linhas = alvos.map(({ cadastro, vinculos: vs }) =>
        vs.length === 0
          ? `• ${cadastro.nome} — sem vínculo ativo`
          : `• ${cadastro.nome} — ${vs.map((v) => `${v.lista === "matriculados" ? "matriculado em" : "na lista de espera de"} ${v.categoria}, ${v.dia} ${v.horario}`).join(" / ")}`,
      );
    }

    const ir = await confirmar({
      titulo: `Você selecionou ${alvos.length} aluno(s) para apagar:`,
      linhas,
      mensagem: "Deseja apagar todos mesmo assim?",
      confirmarLabel: "Confirmar",
      cancelarLabel: "Cancelar",
      perigo: true,
    });
    if (!ir) return;
    const r = apagarCadastros(alvos.map((a) => a.cadastro.id));
    if (!r.ok)
      await avisar({ titulo: "Não foi possível apagar", mensagem: r.erro ?? "", perigo: true });
    else setSel([]);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matrículas</h1>
          <p className="text-sm text-muted-foreground">
            Matricule, edite ou apague alunos da base do clube e combine filtros para localizá-los.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            onClick={() => setExportando(true)}
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar relatório
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
            onClick={() => setNovo(true)}
          >
            <UserPlus className="h-4 w-4" /> Matricular novo aluno
          </button>
        </div>
      </header>

      <Filtros value={filtro} onChange={setFiltro} categorias={categorias} />

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Resultados</h2>
          <div className="flex items-center gap-3">
            {selecionados.length > 0 && (
              <button className={btnGhost} type="button" onClick={apagarSelecionados}>
                <Trash2 className="h-3.5 w-3.5" /> Apagar selecionados ({selecionados.length})
              </button>
            )}
            <span className="text-xs text-muted-foreground">{resultados.length} aluno(s)</span>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2">
                  <label className="flex items-center gap-1.5 font-semibold normal-case">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos"
                      className="accent-[hsl(var(--primary))]"
                      checked={todosMarcados}
                      onChange={toggleTodos}
                    />
                    Todos
                  </label>
                </th>
                {["Nome", "Matrícula", "Idade", "Cadastro", "Vínculos", "Ações"].map((h) => (
                  <th key={h} className="px-4 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resultados.map(({ cadastro, vinculos: vs }) => (
                <tr key={cadastro.id} className="border-t border-border align-top">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${cadastro.nome}`}
                      className="accent-[hsl(var(--primary))]"
                      checked={sel.includes(cadastro.id)}
                      onChange={() => toggle(cadastro.id)}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium text-foreground">{cadastro.nome}</td>
                  <td className="px-4 py-2 text-muted-foreground">{cadastro.matricula}</td>
                  <td className="px-4 py-2 text-muted-foreground">{cadastro.idade}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {formatDate(cadastro.dataCadastro)}
                  </td>
                  <td className="px-4 py-2">
                    {vs.length === 0 ? (
                      <span className="text-xs text-muted-foreground">Sem vínculo ativo</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {vs.map((v, i) => (
                          <li key={i} className="text-xs">
                            <span
                              className={
                                v.lista === "espera"
                                  ? "rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-accent-foreground"
                                  : "rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                              }
                            >
                              {v.lista === "espera" ? "Em espera" : "Matriculado"}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {v.categoria} · {v.dia} · {v.horario} · {v.turma}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`Editar ${cadastro.nome}`}
                        title="Editar dados do aluno"
                        className="text-muted-foreground transition-colors hover:text-primary"
                        onClick={() => setEditando(cadastro)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Apagar ${cadastro.nome}`}
                        title="Apagar aluno do sistema"
                        className="text-muted-foreground transition-colors hover:text-primary"
                        onClick={() => apagarUm(cadastro)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {resultados.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum aluno encontrado com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editando && (
        <AlunoFormDialog
          titulo={`Editar ${editando.nome}`}
          descricao="As datas de matrícula e de entrada na espera não são editáveis."
          inicial={{ nome: editando.nome, matricula: editando.matricula, idade: editando.idade }}
          comData={false}
          onClose={() => setEditando(null)}
          onSubmit={(d) => editarAluno(editando.id, d)}
        />
      )}

      {novo && (
        <NovaMatriculaDialog
          onClose={() => setNovo(false)}
          onSubmit={(local, lista, dados) => addAlunoNovo(local, lista, dados)}
        />
      )}

      {exportando && (
        <ExportarRelatorioDialog onClose={() => setExportando(false)} tipoInicial="1" />
      )}
    </div>
  );
}

function NovaMatriculaDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (
    local: Local,
    lista: Lista,
    dados: { nome: string; matricula: string; idade: number; data: string },
  ) => { ok: boolean; erro?: string };
}) {
  const { categorias } = useStore();
  const { confirmar } = useAviso();
  const hoje = new Date().toISOString().slice(0, 10);
  const key = useId();
  const [destino, setDestino] = useState<Partial<Local>>({});
  const [lista, setLista] = useState<Lista>("matriculados");
  const [form, setForm] = useState({ nome: "", matricula: "", idade: "", data: hoje });
  const [erro, setErro] = useState<string | null>(null);
  const completo = Boolean(destino.catId && destino.diaId && destino.turmaId);

  const inicial = {
    destino: {} as Partial<Local>,
    lista: "matriculados" as Lista,
    form: { nome: "", matricula: "", idade: "", data: hoje },
  };
  const atual = { destino, lista, form };
  const salvar = () => {
    if (!completo) return false;
    const r = onSubmit(destino as Local, lista, {
      nome: form.nome,
      matricula: form.matricula,
      idade: Number(form.idade),
      data: form.data,
    });
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível matricular.");
      return false;
    }
    return true;
  };
  const descartar = () => {
    setDestino({});
    setLista("matriculados");
    setForm({ nome: "", matricula: "", idade: "", data: hoje });
    setErro(null);
  };
  useRascunhoForm(`nova-matricula-${key}`, atual, inicial, salvar, descartar);

  const previewESalvar = () => {
    if (!completo) return;
    const cat = categorias.find((c) => c.id === destino.catId);
    const dia = cat?.dias.find((d) => d.id === destino.diaId);
    const turma = dia?.turmas.find((t) => t.id === destino.turmaId);
    if (!turma) return;

    const r = onSubmit(destino as Local, lista, {
      nome: form.nome,
      matricula: form.matricula,
      idade: Number(form.idade),
      data: form.data,
    });
    if (!r.ok) setErro(r.erro ?? "Não foi possível matricular.");
    else onClose();
  };

  return (
    <Modal
      titulo="Matricular novo aluno"
      descricao="O aluno é cadastrado na base geral do clube e vinculado à turma escolhida."
      erro={erro}
      onClose={onClose}
      footer={
        <button className={btnPrimary} type="button" disabled={!completo} onClick={previewESalvar}>
          Matricular
        </button>
      }
    >
      <input
        className={inputCls}
        maxLength={100}
        placeholder="Nome completo"
        value={form.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
      />
      <input
        className={inputCls}
        maxLength={20}
        placeholder="Número de matrícula"
        value={form.matricula}
        onChange={(e) => setForm({ ...form, matricula: e.target.value })}
      />
      <input
        className={inputCls}
        type="number"
        min={1}
        max={120}
        placeholder="Idade"
        value={form.idade}
        onChange={(e) => setForm({ ...form, idade: e.target.value })}
      />
      <SeletorTurma categorias={categorias} value={destino} onChange={setDestino} />
      <label className="block text-xs font-medium text-muted-foreground">
        Lista
        <select
          className={`${inputCls} mt-1`}
          value={lista}
          onChange={(e) => setLista(e.target.value as Lista)}
        >
          <option value="matriculados">Matriculado</option>
          <option value="espera">Lista de espera</option>
        </select>
      </label>
      <label className="block text-xs font-medium text-muted-foreground">
        {lista === "espera" ? "Data de entrada na espera" : "Data de matrícula"}
        <input
          className={`${inputCls} mt-1`}
          type="date"
          value={form.data}
          onChange={(e) => setForm({ ...form, data: e.target.value })}
        />
      </label>
    </Modal>
  );
}
