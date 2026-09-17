import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useNavigate,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, X } from "lucide-react";

import appCss from "../styles.css?url";
import { AppSidebar } from "@/components/AppSidebar";
import { AvisoProvider } from "@/components/Avisos";
import { StoreProvider, useStore } from "@/lib/store";
import { RascunhoProvider } from "@/lib/rascunho";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LoginScreen } from "@/components/LoginScreen";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#D32F2F" },
      { title: "ClubStrategy — Gestão de aulas do Clube Pirassununga" },
      {
        name: "description",
        content: "Sistema de gestão de turmas e listas de espera das aulas do Clube Pirassununga.",
      },
      { name: "author", content: "Clube Pirassununga" },
      { property: "og:title", content: "ClubStrategy — Clube Pirassununga" },
      {
        property: "og:description",
        content: "Turmas, horários, matriculados e listas de espera em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-192.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Toaster position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

/** Erros de carga/salvamento no banco ficam visíveis até o usuário dispensar. */
function ErroPersistenciaBanner() {
  const { erroPersistencia, limparErroPersistencia } = useStore();
  if (!erroPersistencia) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[75] flex justify-center px-4 pt-3">
      <div className="flex w-full max-w-2xl items-start gap-3 rounded-lg border border-primary/60 bg-card px-4 py-3 shadow-[0_0_12px_rgba(211,47,47,0.2)]">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Erro ao salvar no servidor</p>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">{erroPersistencia}</p>
        </div>
        <button
          type="button"
          aria-label="Dispensar erro"
          className="shrink-0 rounded-md border border-border p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
          onClick={limparErroPersistencia}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function AppConteudo() {
  const { carregando } = useStore();
  if (carregando) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-3 shadow-[var(--shadow-card)]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-semibold text-foreground">Carregando dados do clube…</span>
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="flex min-h-screen w-full bg-background font-sans">
        <AppSidebar />
        <main className="flex-1 overflow-x-hidden p-6">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </main>
      </div>
      <ErroPersistenciaBanner />
    </>
  );
}

function AppGate() {
  const { pronto, autenticado } = useAuth();
  const navigate = useNavigate();
  const redirecionadoRef = useRef(false);

  useEffect(() => {
    if (pronto && autenticado && !redirecionadoRef.current) {
      redirecionadoRef.current = true;
      navigate({ to: "/" });
    }
  }, [pronto, autenticado, navigate]);

  if (!pronto) return <div className="min-h-screen bg-background" />;
  if (!autenticado) return <LoginScreen />;

  return (
    <StoreProvider>
      <AvisoProvider>
        <RascunhoProvider>
          <AppConteudo />
        </RascunhoProvider>
      </AvisoProvider>
    </StoreProvider>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
