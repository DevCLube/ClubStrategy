import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

const MAX_MINUTOS = 23 * 60;

const minutosDaHora = (valor: string) => {
  const texto = valor.trim();
  const partes = texto.split(":");
  const digitos = texto.replace(/\D/g, "");
  const preenchido = digitos.padEnd(4, "0").slice(0, 4);
  const horas = partes.length === 2 ? Number(partes[0]) : Number(preenchido.slice(0, 2));
  const minutosTexto = partes[1] ?? "00";
  const minutos =
    partes.length === 2
      ? Number(minutosTexto.padEnd(2, "0").slice(0, 2))
      : Number(preenchido.slice(2));
  const horaValida = Number.isFinite(horas) ? Math.max(0, Math.min(23, horas)) : 0;
  const minutoValido = Number.isFinite(minutos) ? Math.max(0, Math.min(59, minutos)) : 0;
  const arredondado = Math.round(minutoValido / 30) * 30;
  return Math.min(MAX_MINUTOS, horaValida * 60 + arredondado);
};

const formatarHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

/** Normaliza uma hora para HH:MM, em intervalos de 30 minutos, de 00:00 a 23:00. */
export const normalizarHora = (valor: string) => formatarHora(minutosDaHora(valor || "00:00"));

export function HoraInput({
  value,
  onChange,
  className,
  placeholder = "00:00",
  "aria-label": ariaLabel = "Horário",
}: {
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [digitacao, setDigitacao] = useState<string | null>(null);
  const valorVisivel = digitacao ?? normalizarHora(value || "00:00");

  const ajustar = (delta: number) => {
    const atual = minutosDaHora(digitacao ?? value ?? "00:00");
    const proximo = Math.max(0, Math.min(MAX_MINUTOS, atual + delta * 30));
    setDigitacao(null);
    onChange(formatarHora(proximo));
  };

  return (
    <div className="relative">
      <input
        className={`${className ?? ""} pr-8`}
        inputMode="numeric"
        maxLength={5}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={valorVisivel}
        onChange={(event) => {
          const digitos = event.target.value.replace(/\D/g, "").slice(0, 4);
          setDigitacao(digitos.length > 2 ? `${digitos.slice(0, 2)}:${digitos.slice(2)}` : digitos);
        }}
        onBlur={() => {
          setDigitacao(null);
          onChange(normalizarHora(digitacao ?? value ?? "00:00"));
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            ajustar(1);
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            ajustar(-1);
          }
        }}
      />
      <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 flex-col">
        <button
          type="button"
          aria-label="Aumentar horário em 30 minutos"
          title="Aumentar 30 minutos"
          className="rounded text-muted-foreground transition-colors hover:text-primary"
          onClick={() => ajustar(1)}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Diminuir horário em 30 minutos"
          title="Diminuir 30 minutos"
          className="rounded text-muted-foreground transition-colors hover:text-primary"
          onClick={() => ajustar(-1)}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
