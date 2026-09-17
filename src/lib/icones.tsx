import {
  Waves,
  Bike,
  Flower2,
  Sparkles,
  Music,
  Dumbbell,
  Volleyball,
  Trophy,
  Footprints,
  Target,
  HeartPulse,
} from "lucide-react";
import type { ComponentType } from "react";

export type IconeComponente = ComponentType<{ className?: string }>;

/** Dois lutadores em posição de combate (silhuetas de luta olímpica/MMA). */
export function Lutadores({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="4.6" r="2" />
      <circle cx="18.5" cy="4.6" r="2" />
      <path d="M3 20v-4.2l-1.2-2.6a2 2 0 0 1 1-2.6l2.2-1a2 2 0 0 1 1.8.1L10 11.6" />
      <path d="M21 20v-4.2l1.2-2.6a2 2 0 0 0-1-2.6l-2.2-1a2 2 0 0 0-1.8.1L14 11.6" />
      <path d="M10 11.6 12 13l2-1.4" />
      <path d="M6.4 15.8 5.5 20" />
      <path d="M17.6 15.8l.9 4.2" />
    </svg>
  );
}

export const ICONES: Record<string, IconeComponente> = {
  natacao: Waves,
  spinning: Bike,
  yoga: Flower2,
  ballet: Sparkles,
  jazz: Music,
  musculacao: Dumbbell,
  basquete: Volleyball,
  tenis: Trophy,
  futebol: Footprints,
  tiro: Target,
  luta: Lutadores,
  funcional: HeartPulse,
};

export const ICONES_DISPONIVEIS: { key: string; label: string }[] = [
  { key: "natacao", label: "Natação / água" },
  { key: "spinning", label: "Bike / spinning" },
  { key: "yoga", label: "Yoga / alongamento" },
  { key: "ballet", label: "Ballet / dança" },
  { key: "jazz", label: "Música" },
  { key: "musculacao", label: "Musculação" },
  { key: "basquete", label: "Basquete / bola" },
  { key: "tenis", label: "Tênis / raquete" },
  { key: "futebol", label: "Futebol / corrida" },
  { key: "tiro", label: "Tiro ao alvo" },
  { key: "luta", label: "Lutas / combate" },
  { key: "funcional", label: "Funcional / saúde" },
];

export const iconeDe = (key: string): IconeComponente => ICONES[key] ?? Waves;
