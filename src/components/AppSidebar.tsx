import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  History,
  Plus,
  Trash2,
  LogOut,
  GraduationCap,
} from "lucide-react";
import logo from "@/assets/logo-clube.png.asset.json";
import { contarAlunos, useStore, useAcoes } from "@/lib/store";
import { ICONES_DISPONIVEIS, iconeDe } from "@/lib/icones";
import { Modal, btnPrimary, inputCls } from "@/components/AlunoDialogs";
import { useAviso } from "@/components/Avisos";
import { useRascunho, useRascunhoForm } from "@/lib/rascunho";
import { useAuth } from "@/lib/auth";

const linkBase =
  "flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-secondary";
const activeCls = "bg-primary text-primary-foreground hover:bg-primary";

function GuardedLink({
  to,
  params,
  className,
  activeProps,
  activeOptions,
  children,
}: {
  to: string;
  params?: Record<string, string>;
  className?: string;
  activeProps?: { className?: string };
  activeOptions?: { exact?: boolean };
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { liberarNavegacao, temPendentes } = useRascunho();

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Sem rascunho pendente, navega na hora (sem esperar um microtask/tick),
    // o que deixa a troca de abas imediata. Com rascunho, abre o aviso.
    if (!temPendentes()) {
      navigate({ to, params } as never);
      return;
    }
    void liberarNavegacao().then((ir) => {
      if (ir) navigate({ to, params } as never);
    });
  };

  return (
    <Link
      to={to}
      {...(params ? { params } : {})}
      className={className}
      {...(activeProps ? { activeProps } : {})}
      {...(activeOptions ? { activeOptions } : {})}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function AppSidebar() {
  const { categorias } = useStore();
  const { addCategoria, removeCategoria } = useAcoes();
  const navigate = useNavigate();
  const { avisar, confirmar } = useAviso();
  const { sair } = useAuth();
  const [nova, setNova] = useState(false);

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-card px-4 py-6">
      <div className="flex items-center gap-3">
        <img src={logo.url} alt="Clube Pirassununga" className="h-11 w-11" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">ClubStrategy</p>
          <p className="text-xs text-muted-foreground">Clube Pirassununga</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        <GuardedLink
          to="/"
          className={linkBase}
          activeOptions={{ exact: true }}
          activeProps={{ className: activeCls }}
        >
          <LayoutDashboard className="h-4 w-4" /> Dashboard
        </GuardedLink>
        <GuardedLink to="/matriculas" className={linkBase} activeProps={{ className: activeCls }}>
          <ClipboardList className="h-4 w-4" /> Matrículas
        </GuardedLink>
        <GuardedLink to="/professores" className={linkBase} activeProps={{ className: activeCls }}>
          <GraduationCap className="h-4 w-4" /> Professores
        </GuardedLink>
        <GuardedLink to="/historico" className={linkBase} activeProps={{ className: activeCls }}>
          <History className="h-4 w-4" /> Histórico de Edições
        </GuardedLink>
      </nav>

      <div className="h-px bg-border" />

      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Modalidades
        </p>
        {categorias.map((c) => {
          const Icon = iconeDe(c.icone);
          return (
            <div key={c.id} className="group flex items-center gap-1">
              <GuardedLink
                to="/categoria/$slug"
                params={{ slug: c.id }}
                className={linkBase}
                activeProps={{ className: activeCls }}
              >
                <Icon className="h-4 w-4" /> {c.nome}
              </GuardedLink>
              <button
                aria-label={`Excluir ${c.nome}`}
                title="Excluir modalidade"
                className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                onClick={async () => {
                  const cont = contarAlunos(c.dias.flatMap((d) => d.turmas));
                  if (cont.matriculados + cont.espera > 0) {
                    await avisar({
                      titulo: `Não é possível excluir ${c.nome}`,
                      mensagem: `A modalidade tem ${cont.matriculados} matriculado(s) e ${cont.espera} na lista de espera. Remova os alunos antes de excluir.`,
                      perigo: true,
                    });
                    return;
                  }
                  if (
                    await confirmar({
                      titulo: `Excluir ${c.nome}?`,
                      mensagem:
                        "Todos os dias, horários e turmas desta modalidade serão removidos.",
                      confirmarLabel: "Excluir modalidade",
                      perigo: true,
                    })
                  ) {
                    const r = removeCategoria(c.id);
                    if (!r.ok)
                      await avisar({
                        titulo: "Não foi possível excluir",
                        mensagem: r.erro ?? "Erro inesperado.",
                        perigo: true,
                      });
                    else navigate({ to: "/" });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        <button
          className="mt-1 flex items-center gap-3 rounded-md border border-dashed border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
          onClick={() => setNova(true)}
        >
          <Plus className="h-4 w-4" /> Adicionar modalidade
        </button>
      </nav>

      <div className="mt-auto">
        <button
          className="flex w-full items-center gap-3 rounded-md border-2 border-primary px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          onClick={sair}
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>

      {nova && <NovaCategoriaDialog onClose={() => setNova(false)} onSubmit={addCategoria} />}
    </aside>
  );
}

function NovaCategoriaDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (nome: string, icone: string) => { ok: boolean; erro?: string };
}) {
  const [nome, setNome] = useState("");
  const [icone, setIcone] = useState("basquete");
  const [erro, setErro] = useState<string | null>(null);

  const inicial = { nome: "", icone: "basquete" };
  const form = { nome, icone };
  const salvar = () => {
    const r = onSubmit(nome, icone);
    if (!r.ok) {
      setErro(r.erro ?? "Não foi possível criar a modalidade.");
      return false;
    }
    return true;
  };
  const descartar = () => {
    setNome("");
    setIcone("basquete");
    setErro(null);
  };
  useRascunhoForm("nova-categoria", form, inicial, salvar, descartar);

  return (
    <Modal
      titulo="Nova modalidade"
      descricao="Escolha o ícone que melhor representa a modalidade."
      erro={erro}
      onClose={onClose}
      footer={
        <button
          className={btnPrimary}
          type="button"
          onClick={() => {
            if (salvar()) onClose();
          }}
        >
          Criar modalidade
        </button>
      }
    >
      <input
        className={inputCls}
        maxLength={40}
        placeholder="Nome da modalidade (ex: Basquete)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
      />
      <div className="grid grid-cols-4 gap-2">
        {ICONES_DISPONIVEIS.map((op) => {
          const Icon = iconeDe(op.key);
          return (
            <button
              key={op.key}
              type="button"
              title={op.label}
              onClick={() => setIcone(op.key)}
              className={`flex flex-col items-center gap-1 rounded-md border p-2 text-[10px] transition-colors ${
                icone === op.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{op.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
