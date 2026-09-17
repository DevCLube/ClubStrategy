import type { Categoria } from "./mock-data";

export type Registro = {
  alunoId: string;
  nome: string;
  matricula: string;
  idade: number;
  categoria: string;
  categoriaId: string;
  turma: string;
  dia: string;
  horario: string;
  sala: string;
  status: "Matriculado" | "Em espera";
  data: string; // matrícula ou entrada na espera
};

export function flatten(categorias: Categoria[]): Registro[] {
  const out: Registro[] = [];
  for (const c of categorias) {
    for (const d of c.dias) {
      for (const t of d.turmas) {
        for (const a of t.matriculados) {
          out.push({
            alunoId: a.id,
            nome: a.nome,
            matricula: a.matricula,
            idade: a.idade,
            categoria: c.nome,
            categoriaId: c.id,
            turma: t.nome,
            dia: d.nome,
            horario: t.horario,
            sala: t.sala,
            status: "Matriculado",
            data: a.dataMatricula,
          });
        }
        for (const a of t.espera) {
          out.push({
            alunoId: a.id,
            nome: a.nome,
            matricula: a.matricula,
            idade: a.idade,
            categoria: c.nome,
            categoriaId: c.id,
            turma: t.nome,
            dia: d.nome,
            horario: t.horario,
            sala: t.sala,
            status: "Em espera",
            data: a.dataEspera ?? a.dataMatricula,
          });
        }
      }
    }
  }
  return out;
}

export function resumoCategorias(categorias: Categoria[]) {
  return categorias.map((c) => {
    let turmas = 0;
    let lotadas = 0;
    let matriculados = 0;
    let espera = 0;
    let vagas = 0;
    for (const d of c.dias)
      for (const t of d.turmas) {
        turmas++;
        matriculados += t.matriculados.length;
        espera += t.espera.length;
        if (t.matriculados.length >= t.limite) lotadas++;
        else vagas += t.limite - t.matriculados.length;
      }
    return { id: c.id, nome: c.nome, icone: c.icone, turmas, lotadas, matriculados, espera, vagas };
  });
}

export function turmasLotadas(categorias: Categoria[]) {
  const lotadas: {
    id: string;
    categoria: string;
    categoriaId: string;
    turma: string;
    dia: string;
    horario: string;
    sala: string;
    espera: number;
    ocupacao: string;
  }[] = [];
  let comVaga = 0;
  for (const c of categorias)
    for (const d of c.dias)
      for (const t of d.turmas) {
        // Turma lotada: matriculados == limite (sem overbooking)
        if (t.matriculados.length >= t.limite) {
          lotadas.push({
            id: t.id,
            categoria: c.nome,
            categoriaId: c.id,
            turma: t.nome,
            dia: d.nome,
            horario: t.horario,
            sala: t.sala,
            espera: t.espera.length,
            ocupacao: `${t.matriculados.length}/${t.limite}`,
          });
        } else comVaga++;
      }
  lotadas.sort((a, b) => b.espera - a.espera);
  return { lotadas, comVaga };
}

export type Vinculo = {
  lista: "matriculados" | "espera";
  categoria: string;
  categoriaId: string;
  dia: string;
  horario: string;
  turma: string;
  data: string;
};

/** Vínculos ativos (matriculado/espera) de cada cadastro, indexados por cadastroId. */
export function vinculosPorCadastro(categorias: Categoria[]): Map<string, Vinculo[]> {
  const mapa = new Map<string, Vinculo[]>();
  const push = (cadastroId: string, v: Vinculo) => {
    const atual = mapa.get(cadastroId);
    if (atual) atual.push(v);
    else mapa.set(cadastroId, [v]);
  };
  for (const c of categorias)
    for (const d of c.dias)
      for (const t of d.turmas) {
        for (const a of t.matriculados)
          push(a.cadastroId, {
            lista: "matriculados",
            categoria: c.nome,
            categoriaId: c.id,
            dia: d.nome,
            horario: t.horario,
            turma: t.nome,
            data: a.dataMatricula,
          });
        for (const a of t.espera)
          push(a.cadastroId, {
            lista: "espera",
            categoria: c.nome,
            categoriaId: c.id,
            dia: d.nome,
            horario: t.horario,
            turma: t.nome,
            data: a.dataEspera ?? a.dataMatricula,
          });
      }
  return mapa;
}

export function descreverVinculo(v: Vinculo) {
  return `${v.lista === "matriculados" ? "Matriculado" : "Lista de espera"} — ${v.categoria}, ${v.dia} ${v.horario}`;
}

export type AulaDoProfessor = {
  turmaId: string;
  categoria: string;
  categoriaId: string;
  dia: string;
  diaId: string;
  horario: string;
  turma: string;
  sala: string;
  matriculados: number;
  limite: number;
};

/** Aulas em que o professor está alocado, indexadas por professorId. */
export function aulasDeProfessor(categorias: Categoria[]): Map<string, AulaDoProfessor[]> {
  const mapa = new Map<string, AulaDoProfessor[]>();
  for (const c of categorias)
    for (const d of c.dias)
      for (const t of d.turmas) {
        if (!t.professorId) continue;
        const atual = mapa.get(t.professorId);
        const aula: AulaDoProfessor = {
          turmaId: t.id,
          categoria: c.nome,
          categoriaId: c.id,
          dia: d.nome,
          diaId: d.id,
          horario: t.horario,
          turma: t.nome,
          sala: t.sala,
          matriculados: t.matriculados.length,
          limite: t.limite,
        };
        if (atual) atual.push(aula);
        else mapa.set(t.professorId, [aula]);
      }
  return mapa;
}
