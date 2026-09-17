export type Cadastro = {
  id: string;
  nome: string;
  matricula: string;
  idade: number;
  dataCadastro: string; // ISO
};

export type Aluno = {
  id: string; // id da vinculação com a turma
  cadastroId: string;
  nome: string;
  matricula: string;
  idade: number;
  dataMatricula: string; // ISO
  dataEspera?: string | undefined; // ISO — entrada na lista de espera
};

export type Turma = {
  id: string;
  horario: string;
  nome: string;
  professor: string;
  professorId?: string | undefined;
  sala: string;
  limite: number;
  matriculados: Aluno[];
  espera: Aluno[];
};

/** Professor cadastrado no sistema, com vínculo N:N às modalidades (categorias). */
export type Professor = {
  id: string;
  nome: string;
  /** ids das modalidades (categorias) que ele pode ministrar. */
  modalidadeIds: string[];
};

export type Dia = {
  id: string;
  nome: string;
  turmas: Turma[];
};

export type Categoria = {
  id: string;
  nome: string;
  icone: string;
  dias: Dia[];
};

export type Edicao = {
  id: string;
  aluno: Aluno;
  acao: "adicionado" | "removido" | "promovido" | "transferido" | "editado";
  categoria: string;
  dia: string;
  horario: string;
  turma: string;
  lista: "matriculados" | "espera";
  dataHora: string;
  detalhe?: string;
};

let seq = 0;
export const uid = (p = "id") => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export const CADASTROS_SEED: Cadastro[] = [];

/** Professores são criados automaticamente a partir dos nomes usados nas turmas (migração por nome). */
export const PROFESSORES_SEED: Professor[] = [];

export const CATEGORIAS_SEED: Categoria[] = [];

export const HISTORICO_SEED: Edicao[] = [];

export const DIAS_SEMANA = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

export const ordenarDias = <T extends { nome: string }>(dias: T[]): T[] =>
  [...dias].sort((a, b) => DIAS_SEMANA.indexOf(a.nome) - DIAS_SEMANA.indexOf(b.nome));

export const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-BR");
};

export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

/** Normaliza nome: minúsculas, sem acentos, espaços colapsados. */
export const normalizarNome = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

/** Dois nomes são iguais quando têm exatamente os mesmos sobrenomes (ignorando caixa/acento). */
export const mesmoNome = (a: string, b: string) => normalizarNome(a) === normalizarNome(b);

export const slugify = (nome: string) =>
  normalizarNome(nome)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || uid("cat");

/**
 * Migra aulas legadas que têm nome de professor em texto livre: garante um
 * registro de professor para cada nome distinto usado nas turmas e vincula a
 * aula ao professor de mesmo nome (idempotente). Retorna o novo estado.
 */
export function migrarProfessoresPorNome(
  professores: Professor[],
  categorias: Categoria[],
): { professores: Professor[]; categorias: Categoria[] } {
  const novaLista = [...professores];
  const porNome = new Map(novaLista.map((p) => [normalizarNome(p.nome), p]));

  const pegar = (nome: string) => {
    const chave = normalizarNome(nome);
    const atual = porNome.get(chave);
    if (atual) return atual;
    const criado: Professor = { id: uid("prof"), nome: nome.trim(), modalidadeIds: [] };
    novaLista.push(criado);
    porNome.set(chave, criado);
    return criado;
  };

  const novasCategorias = categorias.map((c) => ({
    ...c,
    dias: c.dias.map((d) => ({
      ...d,
      turmas: d.turmas.map((t) => {
        if (t.professorId) return t;
        const nome = t.professor.trim();
        if (!nome || nome === "A definir") return t;
        const p = pegar(nome);
        return { ...t, professorId: p.id };
      }),
    })),
  }));

  return { professores: novaLista, categorias: novasCategorias };
}
