-- ============================================================
-- Migration: Índices para o Supabase próprio
-- Projeto: bwllxwukpynvuupjnxxh
-- Rodar DEPOIS de 20260916000000_base_tables.sql no SQL Editor
-- ============================================================

-- Índices nas FKs (acelera joins/filtros e exclusões em cascata)
CREATE INDEX IF NOT EXISTS idx_turmas_categoria_id ON public.turmas (categoria_id);
CREATE INDEX IF NOT EXISTS idx_turmas_professor_id ON public.turmas (professor_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turma_id ON public.matriculas (turma_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_aluno_id ON public.matriculas (aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_aluno_id ON public.historico (aluno_id);
CREATE INDEX IF NOT EXISTS idx_historico_turma_id ON public.historico (turma_id);
CREATE INDEX IF NOT EXISTS idx_professor_modalidade_categoria_id ON public.professor_modalidade (categoria_id);

-- Índice no histórico por data (listagem mais recente primeiro)
CREATE INDEX IF NOT EXISTS idx_historico_data_hora ON public.historico (data_hora DESC);