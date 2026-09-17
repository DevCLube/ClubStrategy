CREATE TABLE public.professores (
  id text PRIMARY KEY,
  nome text NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professores TO anon, authenticated;
GRANT ALL ON public.professores TO service_role;
ALTER TABLE public.professores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso publico aos professores" ON public.professores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.professor_modalidade (
  professor_id text NOT NULL REFERENCES public.professores(id) ON DELETE CASCADE,
  categoria_id text NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
  PRIMARY KEY (professor_id, categoria_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.professor_modalidade TO anon, authenticated;
GRANT ALL ON public.professor_modalidade TO service_role;
ALTER TABLE public.professor_modalidade ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso publico aos vinculos de professores" ON public.professor_modalidade FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.turmas ADD COLUMN IF NOT EXISTS professor_id text REFERENCES public.professores(id) ON DELETE SET NULL;