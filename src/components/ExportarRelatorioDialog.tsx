import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { Modal, btnPrimary, inputCls } from "@/components/AlunoDialogs";
import { useStore } from "@/lib/store";
import {
  type DadosRelatorio,
  type FiltroExportar,
  gerarExcel,
  relatorioAlunosMatriculados,
  relatorioHistorico,
  relatorioListaEspera,
  relatorioOcupacao,
  relatorioResumo,
} from "@/lib/exportar-excel";

export type TipoRelatorio = "1" | "2" | "3" | "4" | "5";

const TIPOS: { id: TipoRelatorio; nome: string; descricao: string }[] = [
  { id: "1", nome: "Alunos Matriculados", descricao: "Alunos ativos, um por linha" },
  { id: "2", nome: "Lista de Espera", descricao: "Aguardando vaga, com posição na fila" },
  { id: "3", nome: "Ocupação por Turma", descricao: "Matriculados, limite e status por turma" },
  {
    id: "4",
    nome: "Histórico de Movimentações",
    descricao: "Adições, remoções, promoções e transferências",
  },
  { id: "5", nome: "Resumo por Modalidade", descricao: "Consolidado de todas as modalidades" },
];

const ACOES = [
  { v: "adicionado", l: "Adicionado" },
  { v: "removido", l: "Removido" },
  { v: "promovido", l: "Promovido" },
  { v: "transferido", l: "Transferido" },
  { v: "editado", l: "Editado" },
];

const labelField = "text-xs font-medium text-muted-foreground";

export function ExportarRelatorioDialog({
  onClose,
  tipoInicial = "5",
}: {
  onClose: () => void;
  tipoInicial?: TipoRelatorio;
}) {
  const { categorias, historico } = useStore();
  const [tipo, setTipo] = useState<TipoRelatorio>(tipoInicial);
  const [categoria, setCategoria] = useState("");
  const [turma, setTurma] = useState("");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [status, setStatus] = useState<"todas" | "lotada" | "com-vaga">("todas");
  const [acao, setAcao] = useState("");
  const [gerando, setGerando] = useState(false);

  const mostraTurma = tipo === "1" || tipo === "2";
  const mostraPeriodo = tipo === "1" || tipo === "2" || tipo === "4";
  const mostraStatus = tipo === "3";
  const mostraAcao = tipo === "4";
  const mostraFiltros = tipo !== "5";

  const catSelecionada = categorias.find((c) => c.nome === categoria);
  const turmas = Array.from(
    new Set(
      (catSelecionada ? [catSelecionada] : categorias).flatMap((c) =>
        c.dias.flatMap((d) => d.turmas.map((t) => t.nome)),
      ),
    ),
  ).sort();

  const aplicarAtalho = (dias: number) => {
    const hoje = new Date();
    const deIni = new Date(hoje);
    deIni.setDate(hoje.getDate() - dias);
    setDe(deIni.toISOString().slice(0, 10));
    setAte(hoje.toISOString().slice(0, 10));
  };

  const gerar = async () => {
    setGerando(true);
    try {
      const f: FiltroExportar = { categoria, turma, de, ate, status, acao };
      let dados: DadosRelatorio;
      switch (tipo) {
        case "1":
          dados = relatorioAlunosMatriculados(categorias, f);
          break;
        case "2":
          dados = relatorioListaEspera(categorias, f);
          break;
        case "3":
          dados = relatorioOcupacao(categorias, f);
          break;
        case "4":
          dados = relatorioHistorico(historico, f);
          break;
        default:
          dados = relatorioResumo(categorias);
          break;
      }
      if (dados.linhas.length === 0) {
        toast.error("Nenhum registro encontrado para os filtros escolhidos.");
        return;
      }
      await gerarExcel(dados.nomeArquivo, dados.colunas, dados.linhas, dados.larguras);
      toast.success("Relatório gerado e baixado.");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível gerar o relatório. Tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <Modal
      titulo="Exportar relatório"
      descricao="Escolha o tipo de relatório e, se quiser, refine com filtros antes de gerar o arquivo Excel."
      onClose={onClose}
      wide
      footer={
        <button className={btnPrimary} type="button" onClick={gerar} disabled={gerando}>
          <FileDown className="h-3.5 w-3.5" />
          {gerando ? "Gerando..." : "Gerar relatório"}
        </button>
      }
    >
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tipo de relatório
        </p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTipo(t.id)}
              className={`flex flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                tipo === t.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span className="font-medium">{t.nome}</span>
              <span className="text-[11px] leading-tight">{t.descricao}</span>
            </button>
          ))}
        </div>
      </div>

      {mostraFiltros && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelField}>
            Modalidade
            <select
              className={`${inputCls} mt-1`}
              value={categoria}
              onChange={(e) => {
                setCategoria(e.target.value);
                setTurma("");
              }}
            >
              <option value="">Todas</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.nome}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          {mostraTurma && (
            <label className={labelField}>
              Turma
              <select
                className={`${inputCls} mt-1`}
                value={turma}
                onChange={(e) => setTurma(e.target.value)}
              >
                <option value="">Todas</option>
                {turmas.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mostraStatus && (
            <label className={labelField}>
              Status
              <select
                className={`${inputCls} mt-1`}
                value={status}
                onChange={(e) => setStatus(e.target.value as "todas" | "lotada" | "com-vaga")}
              >
                <option value="todas">Todas</option>
                <option value="lotada">Lotada</option>
                <option value="com-vaga">Com Vaga</option>
              </select>
            </label>
          )}

          {mostraAcao && (
            <label className={labelField}>
              Tipo de ação
              <select
                className={`${inputCls} mt-1`}
                value={acao}
                onChange={(e) => setAcao(e.target.value)}
              >
                <option value="">Todas</option>
                {ACOES.map((a) => (
                  <option key={a.v} value={a.v}>
                    {a.l}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mostraPeriodo && (
            <>
              <label className={labelField}>
                Data inicial
                <input
                  type="date"
                  className={`${inputCls} mt-1`}
                  value={de}
                  onChange={(e) => setDe(e.target.value)}
                />
              </label>
              <label className={labelField}>
                Data final
                <input
                  type="date"
                  className={`${inputCls} mt-1`}
                  value={ate}
                  onChange={(e) => setAte(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
      )}

      {mostraPeriodo && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Atalhos:</span>
          {[
            { l: "Última semana", d: 7 },
            { l: "Último mês", d: 30 },
            { l: "Último ano", d: 365 },
          ].map((a) => (
            <button
              key={a.l}
              type="button"
              onClick={() => aplicarAtalho(a.d)}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {a.l}
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
