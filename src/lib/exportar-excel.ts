import type { Categoria, Edicao } from "./mock-data";
import { formatDate, formatDateTime, ordenarDias } from "./mock-data";
import { resumoCategorias } from "./derive";

export type FiltroExportar = {
  categoria: string; // nome da modalidade ("" = todas)
  turma: string; // nome da turma ("" = todas)
  de: string; // YYYY-MM-DD ("" = sem limite)
  ate: string; // YYYY-MM-DD ("" = sem limite)
  status: "todas" | "lotada" | "com-vaga";
  acao: string; // acao do horizonte de Edicao ("" = todas)
};

export type DadosRelatorio = {
  nomeArquivo: string;
  colunas: string[];
  larguras: number[];
  linhas: (string | number)[][];
};

const PRIMARY_ARGB = "FFD32F2F";

const hoje = () => new Date().toISOString().slice(0, 10);

function dentroDoPeriodo(data: string, de: string, ate: string) {
  const d = data.slice(0, 10);
  if (de && d < de) return false;
  if (ate && d > ate) return false;
  return true;
}

function compararHorario(a: string, b: string) {
  const [ah = 0, am = 0] = a.split(":").map(Number);
  const [bh = 0, bm = 0] = b.split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
}

function turmaDia(horario: string, d: { nome: string }, t: { nome: string }) {
  return `${t.nome} · ${d.nome} ${horario}`;
}

export async function gerarExcel(
  nomeArquivo: string,
  colunas: string[],
  linhas: (string | number)[][],
  larguras: number[],
) {
  const { Workbook } = await import("exceljs");
  const wb = new Workbook();
  const ws = wb.addWorksheet("Relatório");

  ws.columns = colunas.map((cabecalho, i) => ({ header: cabecalho, width: larguras[i] ?? 20 }));

  const cabecalhoRow = ws.getRow(1);
  cabecalhoRow.height = 22;
  cabecalhoRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY_ARGB } };
    cell.alignment = { vertical: "middle" };
  });

  linhas.forEach((l) => ws.addRow(l));

  ws.views = [{ state: "frozen", ySplit: 1, topLeftCell: "A2" }];

  const buffer = await wb.xlsx.writeBuffer();
  baixarArquivo(nomeArquivo, buffer);
}

function baixarArquivo(nomeArquivo: string, buffer: unknown) {
  const blob = new Blob([buffer as ArrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function relatorioAlunosMatriculados(
  categorias: Categoria[],
  f: FiltroExportar,
): DadosRelatorio {
  const linhas: (string | number)[][] = [];
  for (const c of categorias) {
    if (f.categoria && f.categoria !== c.nome) continue;
    for (const d of ordenarDias(c.dias)) {
      const turmas = [...d.turmas].sort((a, b) => compararHorario(a.horario, b.horario));
      for (const t of turmas) {
        if (f.turma && f.turma !== t.nome) continue;
        for (const a of [...t.matriculados].sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"))) {
          if (!dentroDoPeriodo(a.dataMatricula, f.de, f.ate)) continue;
          linhas.push([
            a.nome,
            a.matricula,
            a.idade,
            c.nome,
            turmaDia(t.horario, d, t),
            t.sala,
            t.professor,
            formatDate(a.dataMatricula),
          ]);
        }
      }
    }
  }
  return {
    nomeArquivo: `alunos-matriculados-${hoje()}.xlsx`,
    colunas: [
      "Nome",
      "Matrícula",
      "Idade",
      "Modalidade",
      "Turma (Dia/Horário)",
      "Sala",
      "Professor(a)",
      "Data de Matrícula",
    ],
    larguras: [28, 14, 8, 16, 32, 20, 22, 18],
    linhas,
  };
}

export function relatorioListaEspera(categorias: Categoria[], f: FiltroExportar): DadosRelatorio {
  const linhas: (string | number)[][] = [];
  for (const c of categorias) {
    if (f.categoria && f.categoria !== c.nome) continue;
    for (const d of ordenarDias(c.dias)) {
      const turmas = [...d.turmas].sort((a, b) => compararHorario(a.horario, b.horario));
      for (const t of turmas) {
        if (f.turma && f.turma !== t.nome) continue;
        t.espera.forEach((a, idx) => {
          const dataEspera = a.dataEspera ?? a.dataMatricula;
          if (!dentroDoPeriodo(dataEspera, f.de, f.ate)) return;
          linhas.push([
            a.nome,
            a.matricula,
            a.idade,
            c.nome,
            turmaDia(t.horario, d, t),
            t.sala,
            idx + 1,
            formatDate(dataEspera),
          ]);
        });
      }
    }
  }
  return {
    nomeArquivo: `lista-de-espera-${hoje()}.xlsx`,
    colunas: [
      "Nome",
      "Matrícula",
      "Idade",
      "Modalidade",
      "Turma (Dia/Horário)",
      "Sala",
      "Posição na Fila",
      "Data de Entrada na Espera",
    ],
    larguras: [28, 14, 8, 16, 32, 20, 16, 24],
    linhas,
  };
}

export function relatorioOcupacao(categorias: Categoria[], f: FiltroExportar): DadosRelatorio {
  const linhas: (string | number)[][] = [];
  for (const c of categorias) {
    if (f.categoria && f.categoria !== c.nome) continue;
    for (const d of ordenarDias(c.dias)) {
      const turmas = [...d.turmas].sort((a, b) => compararHorario(a.horario, b.horario));
      for (const t of turmas) {
        const lotada = t.matriculados.length >= t.limite;
        if (f.status === "lotada" && !lotada) continue;
        if (f.status === "com-vaga" && lotada) continue;
        linhas.push([
          c.nome,
          d.nome,
          t.horario,
          t.sala,
          t.professor,
          t.matriculados.length,
          t.limite,
          `${t.matriculados.length}/${t.limite}`,
          t.espera.length,
          lotada ? "Lotada" : "Com Vaga",
        ]);
      }
    }
  }
  return {
    nomeArquivo: `ocupacao-turmas-${hoje()}.xlsx`,
    colunas: [
      "Modalidade",
      "Dia",
      "Horário",
      "Sala",
      "Professor(a)",
      "Matriculados",
      "Limite",
      "Ocupação",
      "Em Espera",
      "Status",
    ],
    larguras: [16, 16, 10, 20, 22, 14, 10, 12, 12, 12],
    linhas,
  };
}

export const LABEL_ACAO: Record<Edicao["acao"], string> = {
  adicionado: "Adicionado",
  removido: "Removido",
  promovido: "Promovido",
  transferido: "Transferido",
  editado: "Editado",
};

export function relatorioHistorico(historico: Edicao[], f: FiltroExportar): DadosRelatorio {
  const linhas = historico
    .filter((e) => {
      if (f.categoria && f.categoria !== e.categoria) return false;
      if (f.acao && f.acao !== e.acao) return false;
      if (!dentroDoPeriodo(e.dataHora, f.de, f.ate)) return false;
      return true;
    })
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
    .map((e) => [
      e.aluno.nome,
      e.aluno.matricula,
      LABEL_ACAO[e.acao],
      e.categoria,
      turmaDia(e.horario, { nome: e.dia }, { nome: e.turma }),
      formatDateTime(e.dataHora),
    ]);
  return {
    nomeArquivo: `historico-movimentacoes-${hoje()}.xlsx`,
    colunas: [
      "Nome do Aluno",
      "Matrícula",
      "Ação",
      "Modalidade",
      "Turma (Dia/Horário)",
      "Data/Hora da Ação",
    ],
    larguras: [28, 14, 14, 16, 32, 20],
    linhas,
  };
}

export function relatorioResumo(categorias: Categoria[]): DadosRelatorio {
  const linhas = resumoCategorias(categorias)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
    .map((r) => [r.nome, r.turmas, r.matriculados, r.espera, r.lotadas, r.turmas - r.lotadas]);
  return {
    nomeArquivo: `resumo-modalidades-${hoje()}.xlsx`,
    colunas: [
      "Modalidade",
      "Total de Turmas",
      "Total de Matriculados",
      "Total em Espera",
      "Turmas Lotadas",
      "Turmas Com Vaga",
    ],
    larguras: [18, 16, 20, 16, 15, 16],
    linhas,
  };
}
