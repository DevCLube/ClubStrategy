import { createContext } from "react";

import type { Cadastro, Categoria, Edicao, Professor, Turma } from "./mock-data";

export type Resultado = { ok: boolean; erro?: string };

export type Lista = "matriculados" | "espera";
export type Local = { catId: string; diaId: string; turmaId: string };

export type DadosAluno = { nome: string; matricula: string; idade: number };

/** Dados do app + estado de persistência. Muda a cada alteração no banco local. */
export type Dados = {
  categorias: Categoria[];
  historico: Edicao[];
  cadastros: Cadastro[];
  professores: Professor[];

  /** Estado da persistência no banco. */
  carregando: boolean;
  erroPersistencia: string | null;
  limparErroPersistencia: () => void;
};

/** Ações de mutação. São funções estáveis: chamá-las não re-renderiza quem só as usa. */
export type Acoes = {
  addCategoria: (nome: string, icone: string) => Resultado;
  removeCategoria: (catId: string) => Resultado;

  addDia: (catId: string, nome: string) => Resultado;
  removeDia: (catId: string, diaId: string) => Resultado;

  addTurma: (
    catId: string,
    diaId: string,
    t: Omit<Turma, "id" | "matriculados" | "espera">,
  ) => Resultado;
  updateTurma: (
    catId: string,
    diaId: string,
    turmaId: string,
    patch: Partial<
      Pick<Turma, "nome" | "professor" | "professorId" | "limite" | "horario" | "sala">
    >,
  ) => Resultado;
  removeTurma: (catId: string, diaId: string, turmaId: string) => Resultado;

  addProfessor: (nome: string, modalidadeIds: string[]) => Resultado;
  updateProfessor: (profId: string, nome: string, modalidadeIds: string[]) => Resultado;
  /** Remove o professor e desafeta as aulas em que ele estava alocado. */
  removeProfessor: (profId: string) => Resultado;

  addAlunoNovo: (local: Local, lista: Lista, dados: DadosAluno & { data: string }) => Resultado;
  addAlunoExistente: (local: Local, lista: Lista, cadastroId: string, data: string) => Resultado;
  editarAluno: (cadastroId: string, dados: DadosAluno) => Resultado;
  /** Exclusão definitiva da base de cadastro (remove também os vínculos com turmas). */
  apagarCadastros: (cadastroIds: string[]) => Resultado;
  removerAlunos: (local: Local, lista: Lista, alunoIds: string[]) => Resultado;
  promover: (catId: string, diaId: string, turmaId: string, alunoId: string) => Resultado;
  transferir: (origem: Local & { lista: Lista; alunoId: string }, destino: Local) => Resultado;
};

export const StoreContext = createContext<Dados | null>(null);
export const StoreAcoesContext = createContext<Acoes | null>(null);
