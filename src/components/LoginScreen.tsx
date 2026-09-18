import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff, User, Lock, ArrowRight, Download } from "lucide-react";
import logo from "@/assets/logo-clube.png";
import bg from "@/assets/login-bg.jpg";
import { useAuth } from "@/lib/auth";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function BotaoBaixarApp() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const aoCapturar = (e: Event) => {
      e.preventDefault();
      setEvento(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", aoCapturar);
    return () => window.removeEventListener("beforeinstallprompt", aoCapturar);
  }, []);

  const instalar = async () => {
    if (evento) {
      await evento.prompt();
      const { outcome } = await evento.userChoice;
      if (outcome === "accepted") setEvento(null);
    } else {
      alert(
        'Para instalar o ClubStrategy, use o menu do navegador e escolha "Instalar app" ou "Adicionar à tela inicial".',
      );
    }
  };

  return (
    <button
      type="button"
      onClick={instalar}
      className="btn-login-secondary mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-[#333333] bg-[#161616] py-2.5 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white"
    >
      <Download className="h-3.5 w-3.5 text-primary" />
      Baixar app ClubStrategy
    </button>
  );
}

export function LoginScreen() {
  const { entrar } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const usuarioRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);

  // Autofill/gerenciador de senhas preenche o campo no DOM sem disparar
  // onChange — sincroniza o estado a partir do elemento para o botão nunca
  // ficar "travado/bloqueado" com as credenciais já preenchidas.
  const sincronizar = () => {
    setUsuario(usuarioRef.current?.value ?? usuario);
    setSenha(senhaRef.current?.value ?? senha);
  };

  // Alguns navegadores/gerenciadores preenchem os campos direto no DOM SEM
  // disparar evento — sobretudo na primeira entrada, com credenciais salvas.
  // Sincroniza o estado a partir do DOM periodicamente para o botão "acender".
  useEffect(() => {
    sincronizar();
    const id = window.setInterval(sincronizar, 300);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vazio = !usuario.trim() || !senha;

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    // Fonte da verdade no submit é o valor real do input (cobre autofill).
    const u = (usuarioRef.current?.value ?? usuario).trim();
    const s = senhaRef.current?.value ?? senha;
    setUsuario(u);
    setSenha(s);
    if (!u || !s) {
      setErro("Digite usuário e senha para entrar.");
      return;
    }
    if (!entrar(u, s)) setErro("Usuário ou senha incorretos");
  };

  return (
    <div className="relative flex min-h-dvh w-full overflow-hidden bg-[#0c0c0c] font-sans antialiased text-white">
      {/* ---------------- PAINEL ESQUERDO (42%) ---------------- */}
      <div className="relative z-10 flex w-full shrink-0 flex-col justify-between p-6 sm:p-10 lg:w-[42%] lg:p-12 xl:p-14 bg-[#0c0c0c]">
        {/* Topo: Logo discreto do Clube */}
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Clube Pirassununga"
            className="h-10 w-10 shrink-0 object-contain brightness-0 invert"
          />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Clube Pirassununga
            </p>
            <p className="text-[10px] text-gray-400">Gestão de Turmas & Aulas</p>
          </div>
        </div>

        {/* Conteúdo Central: Título Sport Bold + Formulário */}
        <div className="my-auto w-full max-w-md self-center lg:self-start">
          {/* Título Principal em destaque */}
          <div className="mb-2">
            <h1 className="text-5xl font-black italic tracking-tighter uppercase sm:text-6xl lg:text-5xl xl:text-6xl">
              <span className="text-primary">CLUB</span>
              <span className="text-white">STRATEGY</span>
            </h1>
            <p className="mt-2 text-base font-semibold text-gray-300 sm:text-lg">
              Acesse sua conta
            </p>
          </div>

          <form onSubmit={submeter} className="mt-8 flex flex-col gap-5">
            {/* Campo Usuário */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Usuário
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  ref={usuarioRef}
                  type="text"
                  autoComplete="username"
                  placeholder="Digite seu usuário"
                  value={usuario}
                  onChange={(e) => {
                    setUsuario(e.target.value);
                    setErro(null);
                  }}
                  onInput={sincronizar}
                  className="w-full rounded-lg border border-[#333333] bg-[#181818] py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  ref={senhaRef}
                  type={ver ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    setErro(null);
                  }}
                  onInput={sincronizar}
                  className="w-full rounded-lg border border-[#333333] bg-[#181818] py-3 pl-10 pr-11 text-sm text-white placeholder:text-gray-500 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setVer((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-white transition-colors"
                >
                  {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Opção Esqueci minha senha */}
            <div className="flex items-center justify-end text-xs">
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  alert("Entre em contato com a administração do clube para redefinir sua senha.");
                }}
                className="text-gray-400 transition-colors hover:text-white hover:underline"
              >
                Esqueci minha senha
              </a>
            </div>

            {/* Botão de Entrar em formato pílula — nunca fica "bloqueado": o clique
            sempre valida o valor real dos campos (sem risco de podar o autofill) */}
            <button
              type="submit"
              aria-disabled={vazio}
              className={`btn-login-primary mt-2 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white transition-all ${
                vazio ? "opacity-60" : ""
              }`}
            >
              <span>ENTRAR</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Alerta de erro de autenticação */}
            {erro && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-center text-xs font-semibold text-primary">
                {erro}
              </div>
            )}
          </form>

          {/* Botão PWA secundário */}
          <BotaoBaixarApp />
        </div>

        {/* Rodapé do formulário */}
        <div className="mt-8 text-center text-[11px] text-gray-500 lg:text-left">
          © {new Date().getFullYear()} Clube Pirassununga. Todos os direitos reservados.
        </div>
      </div>

      {/* ---------------- PAINEL DIREITO (58%) ---------------- */}
      <div className="relative hidden lg:block flex-1 overflow-hidden bg-black">
        {/* Gradiente de Fusão / Desvanecimento na Entrada Esquerda da Imagem */}
        <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-[#0c0c0c] via-[#0c0c0c]/50 to-transparent z-10 pointer-events-none" />

        {/* Imagem Oficial da Quadra com Máscara de Desvanecimento (Fade-in) na Entrada */}
        <img
          src={bg}
          alt="Quadra Oficial do Clube Pirassununga"
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.75) 20%, black 40%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.75) 20%, black 40%)",
          }}
        />

        {/* Overlay escuro sutil de contraste sobre a foto */}
        <div className="absolute inset-0 bg-black/15 pointer-events-none" />

        {/* Barras Diagonais Vermelhas (Canto Inferior Direito) */}
        <div className="absolute bottom-8 right-8 z-20 flex gap-2 -skew-x-[25deg] opacity-90 pointer-events-none">
          <div className="h-6 w-3 rounded-sm bg-primary" />
          <div className="h-6 w-3 rounded-sm bg-primary" />
          <div className="h-6 w-3 rounded-sm bg-primary" />
          <div className="h-6 w-3 rounded-sm bg-primary" />
          <div className="h-6 w-3 rounded-sm bg-primary" />
          <div className="h-6 w-3 rounded-sm bg-primary" />
          <div className="h-6 w-3 rounded-sm bg-primary" />
        </div>
      </div>
    </div>
  );
}
