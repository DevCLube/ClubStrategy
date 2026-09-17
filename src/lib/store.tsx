import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { carregarEstado, salvarEstado } from "./persistencia";

import {
  CADASTROS_SEED,
  CATEGORIAS_SEED,
  HISTORICO_SEED,
  PROFESSORES_SEED,
  mesmoNome,
  migrarProfessoresPorNome,
  ordenarDias,
  slugify,
  uid,
  type Aluno,
  type Cadastro,
  type Categoria,
  type Edicao,
  type Professor,
  type Turma,
} from "./mock-data";

import {
  StoreContext,
  StoreAcoesContext,
  type Acoes,
  type Dados,
  type DadosAluno,
  type Lista,
  type Local,
  type Resultado,
} from "./store-context";

export type { Resultado, Lista, Local, DadosAluno } from "./store-context";

const ok: Resultado = { ok: true };
const falha = (erro: string): Resultado => ({ ok: false, erro });

/* ---------------- helpers puros ---------------- */

export function contarTurma(t: Turma) {
  return { matriculados: t.matriculados.length, espera: t.espera.length };
}

export function contarAlunos(turmas: Turma[]) {
  return turmas.reduce(
    (acc, t) => ({
      matriculados: acc.matriculados + t.matriculados.length,
      espera: acc.espera + t.espera.length,
    }),
    { matriculados: 0, espera: 0 },
  );
}

export function mensagemBloqueio(alvo: string, c: { matriculados: number; espera: number }) {
  return `${alvo} tem ${c.matriculados} matriculado(s) e ${c.espera} na espera. Remova os alunos antes de excluir.`;
}

function validarDados(cadastros: Cadastro[], dados: DadosAluno, ignorarId?: string): Resultado {
  const nome = dados.nome.trim();
  const matricula = dados.matricula.trim();
  if (nome.length < 3) return falha("Informe o nome completo do aluno (mínimo 3 caracteres).");
  if (nome.length > 100) return falha("O nome deve ter no máximo 100 caracteres.");
  if (!matricula) return falha("Informe o número de matrícula.");
  if (!/^[A-Za-z0-9-]{1,20}$/.test(matricula))
    return falha("A matrícula deve ter até 20 caracteres (letras, números ou hífen).");
  if (!Number.isFinite(dados.idade) || dados.idade < 1 || dados.idade > 120)
    return falha("Informe uma idade válida (entre 1 e 120 anos).");

  const outros = cadastros.filter((c) => c.id !== ignorarId);
  if (outros.some((c) => c.matricula.toLowerCase() === matricula.toLowerCase()))
    return falha(`A matrícula ${matricula} já está cadastrada no sistema.`);
  const conflito = outros.find((c) => mesmoNome(c.nome, nome));
  if (conflito)
    return falha(
      `Já existe um aluno cadastrado como "${conflito.nome}" (matrícula ${conflito.matricula}). Para cadastrar outra pessoa, inclua um sobrenome adicional que a diferencie.`,
    );
  return ok;
}

/* ---------------- provider ---------------- */

/** Debounce das ações diretas (adicionar/remover/transferir aluno). */
const ATRASO_ACAO = 1200;
/** Ações estruturais (categoria, dia, turma) são persistidas quase imediatamente. */
const ATRASO_PADRAO = 150;
/** Tempo máximo de espera para carregar os dados do banco antes de usar fallback local. */
const CARREGAR_TIMEOUT_MS = 20_000;
/** Tempo máximo de espera para uma gravação no banco antes de liberar o usuário. */
const SALVAR_TIMEOUT_MS = 25_000;

/** Rejeita caso a operação de escrita não conclua no prazo (evita overlay preso). */
function withTimeout<T>(op: () => Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    op(),
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error("tempo esgotado ao salvar")), ms)),
  ]);
}

/**
 * Cache em módulo: sobrevive a remontagens do provider (HMR do preview,
 * StrictMode, troca de rota). Sem isso a tela volta para "Carregando..." e a
 * lista de modalidades pisca a cada remontagem.
 */
type Estado = {
  categorias: Categoria[];
  historico: Edicao[];
  cadastros: Cadastro[];
  professores: Professor[];
};
let cacheEstado: Estado | null = null;
let cachePromise: Promise<Estado> | null = null;

async function carregarComCache(): Promise<Estado> {
  if (cacheEstado) return cacheEstado;
  if (!cachePromise) {
    cachePromise = (async () => {
      const remoto = await carregarEstado();
      const base = remoto ?? {
        categorias: CATEGORIAS_SEED,
        historico: HISTORICO_SEED,
        cadastros: CADASTROS_SEED,
        professores: PROFESSORES_SEED,
      };
      const migrada = migrarProfessoresPorNome(base.professores, base.categorias);
      const estado: Estado = {
        categorias: migrada.categorias,
        historico: base.historico ?? [],
        cadastros: base.cadastros ?? [],
        professores: migrada.professores,
      };
      cacheEstado = estado;
      return estado;
    })().catch((e) => {
      cachePromise = null;
      throw e;
    });
  }
  return cachePromise;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const inicial = cacheEstado;
  const [categorias, setCategorias] = useState<Categoria[]>(inicial?.categorias ?? CATEGORIAS_SEED);
  const [historico, setHistorico] = useState<Edicao[]>(inicial?.historico ?? HISTORICO_SEED);
  const [cadastros, setCadastros] = useState<Cadastro[]>(inicial?.cadastros ?? CADASTROS_SEED);
  const [professores, setProfessores] = useState<Professor[]>(
    inicial?.professores ?? PROFESSORES_SEED,
  );

  const [carregando, setCarregando] = useState(!inicial);

  const [erroPersistencia, setErroPersistencia] = useState<string | null>(null);

  const carregado = useRef(!!inicial);
  const iniciado = useRef(false);
  /** Falso quando a carga inicial falhou: bloqueia qualquer gravação (evita apagar o banco). */
  const cargaOk = useRef(!!inicial);
  const atrasoRef = useRef(ATRASO_PADRAO);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Assinatura do último estado já presente no banco: evita regravar sem mudança. */
  const assinaturaRef = useRef<string | null>(null);
  /** Estado mais recente, lido dentro do save remoto para evitar gravar dados antigos. */
  const estadoRef = useRef<{
    categorias: Categoria[];
    historico: Edicao[];
    cadastros: Cadastro[];
    professores: Professor[];
  }>({
    categorias,
    historico,
    cadastros,
    professores,
  });
  /** Evita saves concorrentes (dois timers gravando ao mesmo tempo). */
  const salvandoRef = useRef(false);
  /** Marca que houve mudança enquanto um save estava em andamento → precisa re-gravar. */
  const reprocessarRef = useRef(false);
  /**
   * Quando true, a próxima gravação também remove do banco o que saiu do estado
   * (excluir turma/modalidade/professor/aluno).
   */
  const limparRef = useRef(false);
  const assinar = (e: {
    categorias: Categoria[];
    historico: Edicao[];
    cadastros: Cadastro[];
    professores: Professor[];
  }) => JSON.stringify([e.categorias, e.historico, e.cadastros, e.professores]);

  if (inicial && assinaturaRef.current === null) assinaturaRef.current = assinar(inicial);

  /* carga inicial a partir do banco */
  useEffect(() => {
    if (iniciado.current || inicial) return;
    iniciado.current = true;
    const aplicarFallbackLocal = (mensagem?: string) => {
      const migrada = migrarProfessoresPorNome(PROFESSORES_SEED, CATEGORIAS_SEED);
      setCategorias(migrada.categorias);
      setHistorico(HISTORICO_SEED);
      setCadastros(CADASTROS_SEED);
      setProfessores(migrada.professores);
      assinaturaRef.current = assinar({
        categorias: migrada.categorias,
        historico: HISTORICO_SEED,
        cadastros: CADASTROS_SEED,
        professores: migrada.professores,
      });
      setErroPersistencia(
        mensagem
          ? `Banco indisponível. Dados locais temporários: ${mensagem}`
          : "Banco indisponível. Dados locais temporários.",
      );
    };
    (async () => {
      try {
        const estado = await Promise.race([
          carregarComCache(),
          new Promise<Estado>((_, rej) =>
            setTimeout(
              () => rej(new Error("tempo limite de conexão excedido")),
              CARREGAR_TIMEOUT_MS,
            ),
          ),
        ]);
        assinaturaRef.current = assinar(estado);
        cargaOk.current = true;
        setCategorias(estado.categorias);
        setHistorico(estado.historico);
        setCadastros(estado.cadastros);
        setProfessores(estado.professores);
      } catch (e) {
        cargaOk.current = false;
        aplicarFallbackLocal((e as Error).message);
      } finally {
        carregado.current = true;
        setCarregando(false);
      }
    })();
  }, [inicial]);

  /* persistência com debounce — reescreve o último estado e evita conflito de saves */

  // Mantém o snapshot mais recente em um ref para que um save agendado anteriormente
  // nunca grave um estado antigo por cima de alterações novas.
  useEffect(() => {
    estadoRef.current = { categorias, historico, cadastros, professores };
    if (carregado.current && cargaOk.current) cacheEstado = estadoRef.current;
  }, [categorias, historico, cadastros, professores]);

  /**
   * Grava o estado mais recente uma única vez por vez. Se algo mudar durante a
   * gravação, agenda um novo save ao final (evita perda de alterações recentes).
   */
  const executarSave = useCallback(async () => {
    // Nunca grava se a carga inicial falhou: o estado em memória estaria vazio
    // e a gravação apagaria os dados reais do banco.
    if (!cargaOk.current) return;
    if (salvandoRef.current) {
      reprocessarRef.current = true;
      return;
    }
    salvandoRef.current = true;
    try {
      // Snapshot do limpar antes de zerar: exclusões feitas durante o save
      // re-marcam a flag via marcarLimpeza() e a limpeza não se perde.
      const limpar = limparRef.current;
      limparRef.current = false;
      const snap = estadoRef.current;
      const sig = assinar(snap);
      if (sig !== assinaturaRef.current) {
        await withTimeout(() => salvarEstado(snap, { limpar }), SALVAR_TIMEOUT_MS);
        assinaturaRef.current = sig;
        setErroPersistencia(null);
      }
    } catch (e) {
      setErroPersistencia(
        `As alterações não foram gravadas no servidor: ${(e as Error).message}. Tente novamente.`,
      );
    } finally {
      salvandoRef.current = false;
      if (reprocessarRef.current) {
        reprocessarRef.current = false;
        timerRef.current = setTimeout(executarSave, ATRASO_PADRAO);
      }
    }
  }, []);

  useEffect(() => {
    if (!carregado.current || !cargaOk.current) return;
    const atual = assinar({ categorias, historico, cadastros, professores });
    if (atual === assinaturaRef.current) return;
    const atraso = atrasoRef.current;
    atrasoRef.current = ATRASO_PADRAO;
    if (timerRef.current) clearTimeout(timerRef.current);
    // Sem cleanup no unmount: uma remontagem do provider (HMR/preview) não pode
    // cancelar uma gravação pendente, senão a alteração é perdida.
    timerRef.current = setTimeout(executarSave, atraso);
  }, [categorias, historico, cadastros, professores, executarSave]);

  const acoes = useMemo<Acoes>(() => {
    /** Marca a próxima gravação como "ação direta" (debounce mais longo). */
    const acaoDireta = () => {
      atrasoRef.current = ATRASO_ACAO;
    };

    /** Próxima gravação também remove do banco o que saiu do estado. */
    const marcarLimpeza = () => {
      limparRef.current = true;
    };

    // Ações leem o estado mais recente do ref (não do closure) para terem
    // identidade estável: componentes que só chamam ações não re-renderizam.
    const estado = () => estadoRef.current;

    const acharCat = (catId: string) => estado().categorias.find((c) => c.id === catId);
    const acharDia = (catId: string, diaId: string) =>
      acharCat(catId)?.dias.find((d) => d.id === diaId);
    const acharTurma = (l: Local) =>
      acharDia(l.catId, l.diaId)?.turmas.find((t) => t.id === l.turmaId);

    const mapCat = (catId: string, fn: (c: Categoria) => Categoria) =>
      setCategorias((prev) => prev.map((c) => (c.id === catId ? fn(c) : c)));

    const mapTurma = (l: Local, fn: (t: Turma) => Turma) =>
      mapCat(l.catId, (c) => ({
        ...c,
        dias: c.dias.map((d) =>
          d.id !== l.diaId
            ? d
            : { ...d, turmas: d.turmas.map((t) => (t.id === l.turmaId ? fn(t) : t)) },
        ),
      }));

    const registrar = (
      l: Local,
      aluno: Aluno,
      acao: Edicao["acao"],
      lista: Lista,
      detalhe?: string,
    ) => {
      const cat = acharCat(l.catId);
      const dia = acharDia(l.catId, l.diaId);
      const turma = acharTurma(l);
      setHistorico((h) => [
        {
          id: uid("ed"),
          aluno,
          acao,
          categoria: cat?.nome ?? "",
          dia: dia?.nome ?? "",
          horario: turma?.horario ?? "",
          turma: turma?.nome ?? "",
          lista,
          dataHora: new Date().toISOString(),
          ...(detalhe ? { detalhe } : {}),
        },
        ...h,
      ]);
    };

    const hoje = () => new Date().toISOString().slice(0, 10);

    const acoesFn: Acoes = {
      addCategoria: (nome, icone) => {
        const limpo = nome.trim();
        if (limpo.length < 2) return falha("Informe o nome da modalidade.");
        if (limpo.length > 40) return falha("O nome da modalidade deve ter até 40 caracteres.");
        const id = slugify(limpo);
        if (estado().categorias.some((c) => c.id === id || mesmoNome(c.nome, limpo)))
          return falha(`A modalidade "${limpo}" já existe.`);
        setCategorias((prev) => [...prev, { id, nome: limpo, icone, dias: [] }]);
        return ok;
      },

      removeCategoria: (catId) => {
        const cat = acharCat(catId);
        if (!cat) return falha("Modalidade não encontrada.");
        const c = contarAlunos(cat.dias.flatMap((d) => d.turmas));
        if (c.matriculados + c.espera > 0)
          return falha(mensagemBloqueio(`A modalidade ${cat.nome}`, c));
        marcarLimpeza();
        setCategorias((prev) => prev.filter((x) => x.id !== catId));
        return ok;
      },

      addDia: (catId, nome) => {
        const cat = acharCat(catId);
        if (!cat) return falha("Modalidade não encontrada.");
        if (cat.dias.some((d) => d.nome === nome)) return falha(`${nome} já foi adicionado.`);
        mapCat(catId, (c) => ({
          ...c,
          dias: ordenarDias([...c.dias, { id: uid("dia"), nome, turmas: [] }]),
        }));
        return ok;
      },

      removeDia: (catId, diaId) => {
        const dia = acharDia(catId, diaId);
        if (!dia) return falha("Dia não encontrado.");
        const c = contarAlunos(dia.turmas);
        if (c.matriculados + c.espera > 0) return falha(mensagemBloqueio(`${dia.nome}`, c));
        marcarLimpeza();
        mapCat(catId, (cat) => ({ ...cat, dias: cat.dias.filter((d) => d.id !== diaId) }));
        return ok;
      },

      addTurma: (catId, diaId, t) => {
        if (!t.horario.trim()) return falha("Informe o horário da turma.");
        if (!t.nome.trim()) return falha("Informe o nome da turma.");
        if (!t.sala.trim()) return falha("Informe a sala/local da aula.");
        if (!Number.isFinite(t.limite) || t.limite < 1)
          return falha("O limite de vagas deve ser pelo menos 1.");
        mapCat(catId, (c) => ({
          ...c,
          dias: c.dias.map((d) =>
            d.id !== diaId
              ? d
              : {
                  ...d,
                  turmas: [...d.turmas, { ...t, id: uid("tu"), matriculados: [], espera: [] }].sort(
                    (a, b) => a.horario.localeCompare(b.horario, "pt-BR", { numeric: true }),
                  ),
                },
          ),
        }));
        return ok;
      },

      updateTurma: (catId, diaId, turmaId, patch) => {
        const turma = acharTurma({ catId, diaId, turmaId });
        if (!turma) return falha("Turma não encontrada.");
        if (patch.nome !== undefined && !patch.nome.trim())
          return falha("Informe o nome da turma.");
        if (patch.sala !== undefined && !patch.sala.trim())
          return falha("Informe a sala/local da aula.");
        if (patch.limite !== undefined) {
          if (!Number.isFinite(patch.limite) || patch.limite < 1)
            return falha("O limite de vagas deve ser pelo menos 1.");
          if (patch.limite < turma.matriculados.length)
            return falha(
              `Esta turma tem ${turma.matriculados.length} matriculado(s) e o novo limite é ${patch.limite}. Transfira ou remova os alunos excedentes antes de reduzir o limite.`,
            );
        }
        mapTurma({ catId, diaId, turmaId }, (t) => ({ ...t, ...patch }));
        return ok;
      },

      removeTurma: (catId, diaId, turmaId) => {
        const turma = acharTurma({ catId, diaId, turmaId });
        if (!turma) return falha("Turma não encontrada.");
        const c = contarTurma(turma);
        if (c.matriculados + c.espera > 0)
          return falha(mensagemBloqueio(`O horário ${turma.horario} (${turma.nome})`, c));
        marcarLimpeza();
        mapCat(catId, (cat) => ({
          ...cat,
          dias: cat.dias.map((d) =>
            d.id !== diaId ? d : { ...d, turmas: d.turmas.filter((t) => t.id !== turmaId) },
          ),
        }));
        return ok;
      },

      addProfessor: (nome, modalidadeIds) => {
        const limpo = nome.trim();
        if (limpo.length < 3) return falha("Informe o nome do professor (mínimo 3 caracteres).");
        if (limpo.length > 100) return falha("O nome deve ter no máximo 100 caracteres.");
        if (estado().professores.some((p) => mesmoNome(p.nome, limpo)))
          return falha(`Já existe um professor cadastrado como "${limpo}".`);
        setProfessores((prev) => [
          ...prev,
          { id: uid("prof"), nome: limpo, modalidadeIds: [...modalidadeIds] },
        ]);
        return ok;
      },

      updateProfessor: (profId, nome, modalidadeIds) => {
        const atual = estado().professores.find((p) => p.id === profId);
        if (!atual) return falha("Professor não encontrado.");
        const limpo = nome.trim();
        if (limpo.length < 3) return falha("Informe o nome do professor (mínimo 3 caracteres).");
        if (limpo.length > 100) return falha("O nome deve ter no máximo 100 caracteres.");
        if (estado().professores.some((p) => p.id !== profId && mesmoNome(p.nome, limpo)))
          return falha(`Já existe um professor cadastrado como "${limpo}".`);
        setProfessores((prev) =>
          prev.map((p) =>
            p.id === profId ? { ...p, nome: limpo, modalidadeIds: [...modalidadeIds] } : p,
          ),
        );
        const atualizarTurma = (t: Turma) =>
          t.professorId === profId ? { ...t, professor: limpo } : t;
        marcarLimpeza();
        setCategorias((prev) =>
          prev.map((c) => ({
            ...c,
            dias: c.dias.map((d) => ({
              ...d,
              turmas: d.turmas.map(atualizarTurma),
            })),
          })),
        );
        return ok;
      },

      removeProfessor: (profId) => {
        const alvo = estado().professores.find((p) => p.id === profId);
        if (!alvo) return falha("Professor não encontrado.");
        acaoDireta();
        marcarLimpeza();
        const desafetar = (t: Turma) =>
          t.professorId === profId ? { ...t, professor: "A definir", professorId: undefined } : t;
        setCategorias((prev) =>
          prev.map((c) => ({
            ...c,
            dias: c.dias.map((d) => ({
              ...d,
              turmas: d.turmas.map(desafetar),
            })),
          })),
        );
        setProfessores((prev) => prev.filter((p) => p.id !== profId));
        return ok;
      },

      addAlunoNovo: (local, lista, dados) => {
        const v = validarDados(estado().cadastros, dados);
        if (!v.ok) return v;
        const turma = acharTurma(local);
        if (!turma) return falha("Turma não encontrada.");
        if (lista === "matriculados" && turma.matriculados.length >= turma.limite)
          return falha(
            `A turma está lotada (${turma.matriculados.length}/${turma.limite}). Adicione o aluno à lista de espera ou aumente o limite de vagas.`,
          );
        const cadastro: Cadastro = {
          id: uid("cad"),
          nome: dados.nome.trim(),
          matricula: dados.matricula.trim(),
          idade: dados.idade,
          dataCadastro: dados.data,
        };
        const novo: Aluno = {
          id: uid("al"),
          cadastroId: cadastro.id,
          nome: cadastro.nome,
          matricula: cadastro.matricula,
          idade: cadastro.idade,
          dataMatricula: lista === "espera" ? hoje() : dados.data,
          dataEspera: lista === "espera" ? dados.data : undefined,
        };
        setCadastros((prev) => [...prev, cadastro]);
        mapTurma(local, (t) => ({ ...t, [lista]: [...t[lista], novo] }) as Turma);
        registrar(local, novo, "adicionado", lista);
        return ok;
      },

      addAlunoExistente: (local, lista, cadastroId, data) => {
        const cadastro = estado().cadastros.find((c) => c.id === cadastroId);
        if (!cadastro) return falha("Aluno não encontrado na base de cadastros.");
        const turma = acharTurma(local);
        if (!turma) return falha("Turma não encontrada.");
        if ([...turma.matriculados, ...turma.espera].some((a) => a.cadastroId === cadastroId))
          return falha(`${cadastro.nome} já está nesta turma.`);
        if (lista === "matriculados" && turma.matriculados.length >= turma.limite)
          return falha(
            `A turma está lotada (${turma.matriculados.length}/${turma.limite}). Adicione o aluno à lista de espera ou aumente o limite de vagas.`,
          );
        const novo: Aluno = {
          id: uid("al"),
          cadastroId: cadastro.id,
          nome: cadastro.nome,
          matricula: cadastro.matricula,
          idade: cadastro.idade,
          dataMatricula: lista === "espera" ? hoje() : data,
          dataEspera: lista === "espera" ? data : undefined,
        };
        mapTurma(local, (t) => ({ ...t, [lista]: [...t[lista], novo] }) as Turma);
        registrar(local, novo, "adicionado", lista);
        return ok;
      },

      editarAluno: (cadastroId, dados) => {
        const v = validarDados(estado().cadastros, dados, cadastroId);
        if (!v.ok) return v;
        const nome = dados.nome.trim();
        const matricula = dados.matricula.trim();
        setCadastros((prev) =>
          prev.map((c) =>
            c.id === cadastroId ? { ...c, nome, matricula, idade: dados.idade } : c,
          ),
        );
        const atualizar = (a: Aluno) =>
          a.cadastroId === cadastroId ? { ...a, nome, matricula, idade: dados.idade } : a;
        setCategorias((prev) =>
          prev.map((c) => ({
            ...c,
            dias: c.dias.map((d) => ({
              ...d,
              turmas: d.turmas.map((t) => ({
                ...t,
                matriculados: t.matriculados.map(atualizar),
                espera: t.espera.map(atualizar),
              })),
            })),
          })),
        );
        return ok;
      },

      apagarCadastros: (cadastroIds) => {
        const ids = new Set(cadastroIds);
        if (ids.size === 0) return falha("Nenhum aluno selecionado.");
        const alvos = estado().cadastros.filter((c) => ids.has(c.id));
        if (alvos.length === 0) return falha("Aluno não encontrado na base de cadastros.");
        acaoDireta();
        marcarLimpeza();

        for (const c of estado().categorias)
          for (const d of c.dias)
            for (const t of d.turmas) {
              const l: Local = { catId: c.id, diaId: d.id, turmaId: t.id };
              for (const lista of ["matriculados", "espera"] as Lista[])
                for (const a of t[lista])
                  if (ids.has(a.cadastroId))
                    registrar(l, a, "removido", lista, "Aluno apagado do sistema");
            }

        const limpar = (as: Aluno[]) => as.filter((a) => !ids.has(a.cadastroId));
        setCategorias((prev) =>
          prev.map((c) => ({
            ...c,
            dias: c.dias.map((d) => ({
              ...d,
              turmas: d.turmas.map((t) => ({
                ...t,
                matriculados: limpar(t.matriculados),
                espera: limpar(t.espera),
              })),
            })),
          })),
        );
        setCadastros((prev) => prev.filter((c) => !ids.has(c.id)));
        return ok;
      },

      removerAlunos: (local, lista, alunoIds) => {
        const turma = acharTurma(local);
        if (!turma) return falha("Turma não encontrada.");
        const removidos = turma[lista].filter((a) => alunoIds.includes(a.id));
        if (removidos.length === 0) return falha("Nenhum aluno selecionado.");
        marcarLimpeza();
        mapTurma(
          local,
          (t) =>
            ({
              ...t,
              [lista]: t[lista].filter((a) => !alunoIds.includes(a.id)),
            }) as Turma,
        );
        removidos.forEach((a) => registrar(local, a, "removido", lista));
        return ok;
      },

      promover: (catId, diaId, turmaId, alunoId) => {
        const local = { catId, diaId, turmaId };
        const turma = acharTurma(local);
        if (!turma) return falha("Turma não encontrada.");
        const alvo = turma.espera.find((a) => a.id === alunoId);
        if (!alvo) return falha("Aluno não encontrado na lista de espera.");
        if (turma.matriculados.length >= turma.limite)
          return falha(
            `A turma está lotada (${turma.matriculados.length}/${turma.limite}). Aumente o limite ou libere uma vaga antes de promover.`,
          );
        const promovido: Aluno = {
          ...alvo,
          dataMatricula: hoje(),
          dataEspera: undefined,
        };
        mapTurma(local, (t) => ({
          ...t,
          espera: t.espera.filter((a) => a.id !== alunoId),
          matriculados: [...t.matriculados, promovido],
        }));
        registrar(local, promovido, "promovido", "matriculados");
        return ok;
      },

      transferir: (origem, destino) => {
        const turmaOrigem = acharTurma(origem);
        const turmaDestino = acharTurma(destino);
        if (!turmaOrigem || !turmaDestino) return falha("Turma não encontrada.");
        if (turmaOrigem.id === turmaDestino.id)
          return falha("Escolha uma turma de destino diferente.");
        const alvo = turmaOrigem[origem.lista].find((a) => a.id === origem.alunoId);
        if (!alvo) return falha("Aluno não encontrado.");
        if (
          [...turmaDestino.matriculados, ...turmaDestino.espera].some(
            (a) => a.cadastroId === alvo.cadastroId,
          )
        )
          return falha(`${alvo.nome} já está na turma de destino.`);
        marcarLimpeza();

        const temVaga = turmaDestino.matriculados.length < turmaDestino.limite;
        const listaDestino: Lista = temVaga ? "matriculados" : "espera";
        const novo: Aluno = {
          ...alvo,
          id: uid("al"),
          dataMatricula: temVaga ? hoje() : alvo.dataMatricula,
          dataEspera: temVaga ? undefined : hoje(),
        };

        const catDestino = acharCat(destino.catId);
        const diaDestino = acharDia(destino.catId, destino.diaId);

        setCategorias((prev) =>
          prev.map((c) => ({
            ...c,
            dias: c.dias.map((d) => ({
              ...d,
              turmas: d.turmas.map((t) => {
                let nova = t;
                if (t.id === turmaOrigem.id)
                  nova = {
                    ...nova,
                    [origem.lista]: nova[origem.lista].filter((a) => a.id !== origem.alunoId),
                  } as Turma;
                if (t.id === turmaDestino.id)
                  nova = { ...nova, [listaDestino]: [...nova[listaDestino], novo] } as Turma;
                return nova;
              }),
            })),
          })),
        );

        const destinoTxt = `${catDestino?.nome ?? ""} · ${diaDestino?.nome ?? ""} · ${turmaDestino.horario} ${turmaDestino.nome} (${listaDestino === "espera" ? "lista de espera" : "matriculado"})`;
        registrar(origem, alvo, "transferido", origem.lista, `Transferido para ${destinoTxt}`);
        registrar(
          destino,
          novo,
          "adicionado",
          listaDestino,
          `Recebido por transferência de ${turmaOrigem.horario} ${turmaOrigem.nome}`,
        );
        return ok;
      },
    };
    return acoesFn;
  }, []);

  const dados = useMemo<Dados>(
    () => ({
      categorias,
      historico,
      cadastros,
      professores,
      carregando,
      erroPersistencia,
      limparErroPersistencia: () => setErroPersistencia(null),
    }),
    [categorias, historico, cadastros, professores, carregando, erroPersistencia],
  );

  return (
    <StoreContext.Provider value={dados}>
      <StoreAcoesContext.Provider value={acoes}>{children}</StoreAcoesContext.Provider>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore fora do StoreProvider");
  return ctx;
}

export function useAcoes() {
  const ctx = useContext(StoreAcoesContext);
  if (!ctx) throw new Error("useAcoes fora do StoreProvider");
  return ctx;
}
