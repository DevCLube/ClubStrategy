import { supabase } from "@/integrations/supabase/client";
import {
  ordenarDias,
  slugify,
  type Aluno,
  type Cadastro,
  type Categoria,
  type Dia,
  type Edicao,
  type Professor,
  type Turma,
} from "./mock-data";

export type EstadoApp = {
  categorias: Categoria[];
  historico: Edicao[];
  cadastros: Cadastro[];
  professores: Professor[];
};

const diaId = (catId: string, nome: string) => `dia-${catId}-${slugify(nome)}`;

function erro(e: { message: string } | null, contexto: string) {
  if (e) throw new Error(`${contexto}: ${e.message}`);
}

/* ---------------- leitura ---------------- */

export async function carregarEstado(): Promise<EstadoApp | null> {
  const [alunosR, categoriasR, turmasR, matriculasR, historicoR, professoresR, vinculosR] =
    await Promise.all([
      supabase.from("alunos").select("*"),
      supabase.from("categorias").select("*"),
      supabase.from("turmas").select("*"),
      supabase.from("matriculas").select("*").order("ordem", { ascending: true }),
      supabase.from("historico").select("*").order("data_hora", { ascending: false }),
      supabase.from("professores").select("*"),
      supabase.from("professor_modalidade").select("*"),
    ]);

  erro(alunosR.error, "alunos");
  erro(categoriasR.error, "categorias");
  erro(turmasR.error, "turmas");
  erro(matriculasR.error, "matrículas");
  erro(historicoR.error, "histórico");
  erro(professoresR.error, "professores");
  erro(vinculosR.error, "vínculos de professores");

  const alunos = alunosR.data ?? [];
  const cats = categoriasR.data ?? [];
  const turmas = turmasR.data ?? [];
  const matriculas = matriculasR.data ?? [];
  const historicoRows = historicoR.data ?? [];
  const professorRows = professoresR.data ?? [];
  const vinculoRows = vinculosR.data ?? [];

  // Só considera o banco "vazio/não inicializado" quando NENHUMA tabela tem dados.
  // Antes checava apenas categorias+alunos: se houvesse professores/turmas/histórico
  // sem categoria(s), o app recriava a semente e APAGAVA o que já existia.
  const completamenteVazio =
    cats.length === 0 &&
    alunos.length === 0 &&
    turmas.length === 0 &&
    matriculas.length === 0 &&
    historicoRows.length === 0 &&
    professorRows.length === 0 &&
    vinculoRows.length === 0;
  if (completamenteVazio) return null;

  const professores: Professor[] = professorRows.map((p) => ({
    id: p.id,
    nome: p.nome,
    modalidadeIds: vinculoRows.filter((v) => v.professor_id === p.id).map((v) => v.categoria_id),
  }));

  const cadastros: Cadastro[] = alunos.map((a) => ({
    id: a.id,
    nome: a.nome,
    matricula: a.matricula,
    idade: a.idade,
    dataCadastro: a.data_cadastro,
  }));
  const porCadastro = new Map(cadastros.map((c) => [c.id, c]));

  const vinculo = (m: (typeof matriculas)[number]): Aluno => {
    const c = porCadastro.get(m.aluno_id);
    return {
      id: m.id,
      cadastroId: m.aluno_id,
      nome: c?.nome ?? "",
      matricula: c?.matricula ?? "",
      idade: c?.idade ?? 0,
      dataMatricula: m.data_matricula,
      dataEspera: m.data_espera ?? undefined,
    };
  };

  const categorias: Categoria[] = cats.map((c) => {
    const daCategoria = turmas.filter((t) => t.categoria_id === c.id);
    const nomesDias = [...new Set(daCategoria.map((t) => t.dia_semana))];
    const dias: Dia[] = nomesDias.map((nome) => ({
      id: diaId(c.id, nome),
      nome,
      turmas: daCategoria
        .filter((t) => t.dia_semana === nome)
        .map<Turma>((t) => ({
          id: t.id,
          nome: t.nome,
          horario: t.horario,
          professor: t.professor,
          professorId: t.professor_id ?? undefined,
          sala: t.sala,
          limite: t.limite,
          matriculados: matriculas
            .filter((m) => m.turma_id === t.id && m.status === "matriculado")
            .map(vinculo),
          espera: matriculas
            .filter((m) => m.turma_id === t.id && m.status === "espera")
            .map(vinculo),
        }))
        .sort((a, b) => a.horario.localeCompare(b.horario, "pt-BR", { numeric: true })),
    }));
    return { id: c.id, nome: c.nome, icone: c.icone ?? "", dias: ordenarDias(dias) };
  });

  const historico: Edicao[] = historicoRows.map((h) => ({
    id: h.id,
    aluno: {
      id: h.id,
      cadastroId: h.aluno_id ?? "",
      nome: h.aluno_nome ?? porCadastro.get(h.aluno_id ?? "")?.nome ?? "",
      matricula: h.aluno_matricula ?? porCadastro.get(h.aluno_id ?? "")?.matricula ?? "",
      idade: h.aluno_idade ?? porCadastro.get(h.aluno_id ?? "")?.idade ?? 0,
      dataMatricula: h.data_hora.slice(0, 10),
    },
    acao: (h.acao as Edicao["acao"]) ?? "editado",
    categoria: h.categoria ?? "",
    dia: h.dia ?? "",
    horario: h.horario ?? "",
    turma: h.turma_nome ?? "",
    lista: (h.lista as Edicao["lista"]) ?? "matriculados",
    dataHora: h.data_hora,
    ...(h.detalhe ? { detalhe: h.detalhe } : {}),
  }));

  return { categorias, historico, cadastros, professores };
}

/* ---------------- escrita ---------------- */

async function apagarSobras(
  tabela: "alunos" | "categorias" | "turmas" | "matriculas" | "historico" | "professores",
  manter: Set<string>,
) {
  const { data, error } = await supabase.from(tabela).select("id");
  erro(error, `leitura de ${tabela}`);
  const sobras = (data ?? []).map((r) => r.id).filter((id) => !manter.has(id));
  if (sobras.length === 0) return;
  const { error: e2 } = await supabase.from(tabela).delete().in("id", sobras);
  erro(e2, `limpeza de ${tabela}`);
}

/** Remove vínculos professor↔modalidade que deixaram de existir (chave composta). */
async function apagarVinculosSobras(manter: Set<string>) {
  const { data, error } = await supabase
    .from("professor_modalidade")
    .select("professor_id, categoria_id");
  erro(error, "leitura de professor_modalidade");
  const sobras = (data ?? []).filter((v) => !manter.has(`${v.professor_id}|${v.categoria_id}`));
  if (sobras.length === 0) return;
  for (const v of sobras) {
    const { error: e2 } = await supabase
      .from("professor_modalidade")
      .delete()
      .eq("professor_id", v.professor_id)
      .eq("categoria_id", v.categoria_id);
    erro(e2, "limpeza de professor_modalidade");
  }
}

export type OpcoesSalvar = { limpar?: boolean };

export async function salvarEstado(estado: EstadoApp, opcoes: OpcoesSalvar = {}): Promise<void> {
  const alunos = estado.cadastros.map((c) => ({
    id: c.id,
    nome: c.nome,
    idade: c.idade,
    matricula: c.matricula,
    data_cadastro: c.dataCadastro,
  }));
  const categorias = estado.categorias.map((c) => ({ id: c.id, nome: c.nome, icone: c.icone }));
  const professores = estado.professores.map((p) => ({ id: p.id, nome: p.nome }));
  const vinculos: {
    professor_id: string;
    categoria_id: string;
  }[] = [];

  for (const p of estado.professores)
    for (const catId of p.modalidadeIds) vinculos.push({ professor_id: p.id, categoria_id: catId });

  const turmas: {
    id: string;
    categoria_id: string;
    dia_semana: string;
    nome: string;
    horario: string;
    professor: string;
    professor_id: string | null;
    sala: string;
    limite: number;
  }[] = [];
  const matriculas: {
    id: string;
    turma_id: string;
    aluno_id: string;
    status: string;
    data_matricula: string;
    data_espera: string | null;
    ordem: number;
  }[] = [];

  const idsCadastro = new Set(estado.cadastros.map((c) => c.id));
  // Chave = dia|horário|nome → pode colidir quando há 2 turmas com mesmo
  // dia/horário/nome mas salas diferentes. Usamos Array e só associamos
  // se houver exatamente 1 correspondência; caso contrário seta null (FK segura).
  const chaveTurma = new Map<string, string[]>();

  for (const c of estado.categorias)
    for (const d of c.dias)
      for (const t of d.turmas) {
        turmas.push({
          id: t.id,
          categoria_id: c.id,
          dia_semana: d.nome,
          nome: t.nome,
          horario: t.horario,
          professor: t.professor,
          professor_id: t.professorId ?? null,
          sala: t.sala,
          limite: t.limite,
        });
        const chave = `${d.nome}|${t.horario}|${t.nome}`;
        const arr = chaveTurma.get(chave);
        if (arr) arr.push(t.id);
        else chaveTurma.set(chave, [t.id]);
        const push = (a: Aluno, status: "matriculado" | "espera", i: number) => {
          if (!idsCadastro.has(a.cadastroId)) return;
          matriculas.push({
            id: a.id,
            turma_id: t.id,
            aluno_id: a.cadastroId,
            status,
            data_matricula: a.dataMatricula,
            data_espera: a.dataEspera ?? null,
            ordem: i + 1,
          });
        };
        t.matriculados.forEach((a, i) => push(a, "matriculado", i));
        t.espera.forEach((a, i) => push(a, "espera", i));
      }

  const resolverTurma = (h: { dia: string; horario: string; turma: string }) => {
    const arr = chaveTurma.get(`${h.dia}|${h.horario}|${h.turma}`);
    return arr && arr.length === 1 ? arr[0]! : null;
  };

  const historico = estado.historico.map((h) => ({
    id: h.id,
    aluno_id: idsCadastro.has(h.aluno.cadastroId) ? h.aluno.cadastroId : null,
    turma_id: resolverTurma(h),
    acao: h.acao,
    detalhe: h.detalhe ?? null,
    data_hora: h.dataHora,
    aluno_nome: h.aluno.nome,
    aluno_matricula: h.aluno.matricula,
    aluno_idade: h.aluno.idade,
    categoria: h.categoria,
    dia: h.dia,
    horario: h.horario,
    turma_nome: h.turma,
    lista: h.lista,
  }));

  // limpar=false (padrão): apenas UPSERTS em paralelo, muito mais rápido para o
  // caso comum (editar/adicionar). limpar=true: remove sobras (alunos, turmas,
  // modalidades, professor, vínculos e histórico que deixaram de existir).
  const limpar = opcoes?.limpar ?? false;

  // ---- 1. grava os pais (paralelo): alunos, modalidades e professores ----
  const rAlunos = alunos.length
    ? supabase.from("alunos").upsert(alunos)
    : Promise.resolve({ error: null });
  const rCategorias = categorias.length
    ? supabase.from("categorias").upsert(categorias)
    : Promise.resolve({ error: null });
  const rProfessores = professores.length
    ? supabase.from("professores").upsert(professores)
    : Promise.resolve({ error: null });
  const [ua, uc, up] = await Promise.all([rAlunos, rCategorias, rProfessores]);
  erro(ua.error, "gravar alunos");
  erro(uc.error, "gravar modalidades");
  erro(up.error, "gravar professores");

  // ---- 2. grava turmas (dependem das modalidades existirem) ----
  if (turmas.length) erro((await supabase.from("turmas").upsert(turmas)).error, "gravar turmas");

  // ---- 3. grava filhos em paralelo: matrículas, histórico e vínculos ----
  const rMatriculas = matriculas.length
    ? supabase.from("matriculas").upsert(matriculas)
    : Promise.resolve({ error: null });
  const rHistorico = historico.length
    ? supabase.from("historico").upsert(historico)
    : Promise.resolve({ error: null });
  const rVinculos = vinculos.length
    ? supabase.from("professor_modalidade").upsert(vinculos)
    : Promise.resolve({ error: null });
  const [um, uh, uv] = await Promise.all([rMatriculas, rHistorico, rVinculos]);
  erro(um.error, "gravar matrículas");
  erro(uh.error, "gravar histórico");
  erro(uv.error, "gravar vínculos de professores");

  if (!limpar) return;

  // ---- 4. limpeza: remove o que saiu do estado (respeitando as FKs) ----
  // Filhos antes dos pais.
  await Promise.all([
    apagarSobras("matriculas", new Set(matriculas.map((m) => m.id))),
    apagarSobras("historico", new Set(historico.map((h) => h.id))),
    apagarVinculosSobras(new Set(vinculos.map((v) => `${v.professor_id}|${v.categoria_id}`))),
  ]);
  // Pais: turmas → modalidades → alunos, e professores por último (FK set null).
  await apagarSobras("turmas", new Set(turmas.map((t) => t.id)));
  await apagarSobras("categorias", new Set(categorias.map((c) => c.id)));
  await apagarSobras("alunos", new Set(alunos.map((a) => a.id)));
  await apagarSobras("professores", new Set(professores.map((p) => p.id)));
}
