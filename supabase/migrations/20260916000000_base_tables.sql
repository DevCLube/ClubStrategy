-- ============================================================
-- Migration: Setup completo de tabelas para o Supabase próprio
-- Projeto: bwllxwukpynvuupjnxxh
-- Rodar no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. categorias (modalidades)
CREATE TABLE IF NOT EXISTS public.categorias (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  icone TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categorias TO anon, authenticated;
GRANT ALL ON public.categorias TO service_role;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico as categorias" ON public.categorias;
CREATE POLICY "Acesso publico as categorias" ON public.categorias
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. alunos (cadastro base)
CREATE TABLE IF NOT EXISTS public.alunos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  matricula TEXT NOT NULL,
  idade INTEGER NOT NULL,
  data_cadastro TEXT NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO anon, authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico aos alunos" ON public.alunos;
CREATE POLICY "Acesso publico aos alunos" ON public.alunos
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. professores
CREATE TABLE IF NOT EXISTS public.professores (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professores TO anon, authenticated;
GRANT ALL ON public.professores TO service_role;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico aos professores" ON public.professores;
CREATE POLICY "Acesso publico aos professores" ON public.professores
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id TEXT PRIMARY KEY,
  categoria_id TEXT NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  dia_semana TEXT NOT NULL,
  nome TEXT NOT NULL,
  horario TEXT NOT NULL,
  professor TEXT NOT NULL DEFAULT 'A definir',
  professor_id TEXT REFERENCES public.professores(id) ON DELETE SET NULL,
  sala TEXT NOT NULL,
  limite INTEGER NOT NULL DEFAULT 15
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas TO anon, authenticated;
GRANT ALL ON public.turmas TO service_role;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico as turmas" ON public.turmas;
CREATE POLICY "Acesso publico as turmas" ON public.turmas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. matriculas (vínculo aluno ↔ turma)
CREATE TABLE IF NOT EXISTS public.matriculas (
  id TEXT PRIMARY KEY,
  turma_id TEXT NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  aluno_id TEXT NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  data_matricula TEXT NOT NULL,
  data_espera TEXT,
  ordem INTEGER NOT NULL DEFAULT 1
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.matriculas TO anon, authenticated;
GRANT ALL ON public.matriculas TO service_role;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico as matriculas" ON public.matriculas;
CREATE POLICY "Acesso publico as matriculas" ON public.matriculas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. historico
CREATE TABLE IF NOT EXISTS public.historico (
  id TEXT PRIMARY KEY,
  aluno_id TEXT REFERENCES public.alunos(id) ON DELETE SET NULL,
  turma_id TEXT REFERENCES public.turmas(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  detalhe TEXT,
  data_hora TEXT NOT NULL,
  aluno_nome TEXT,
  aluno_matricula TEXT,
  aluno_idade INTEGER,
  categoria TEXT,
  dia TEXT,
  horario TEXT,
  turma_nome TEXT,
  lista TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.historico TO anon, authenticated;
GRANT ALL ON public.historico TO service_role;
ALTER TABLE public.historico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico ao historico" ON public.historico;
CREATE POLICY "Acesso publico ao historico" ON public.historico
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. professor_modalidade (vínculo N:N)
CREATE TABLE IF NOT EXISTS public.professor_modalidade (
  professor_id TEXT NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  categoria_id TEXT NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (professor_id, categoria_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professor_modalidade TO anon, authenticated;
GRANT ALL ON public.professor_modalidade TO service_role;
ALTER TABLE public.professor_modalidade ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso publico aos vinculos de professores" ON public.professor_modalidade;
CREATE POLICY "Acesso publico aos vinculos de professores" ON public.professor_modalidade
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
