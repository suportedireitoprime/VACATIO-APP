import { ReactNode } from "react";
import { PALETA } from "@/lib/visuaisJuridicos/layout";

/**
 * Cartão "ficha editorial" — mesma identidade do mapa mental e do PDF:
 * papel creme, cabeçalho vinho com cérebro vazado, fio dourado e assinatura.
 */
export default function FichaEditorial({
  etiqueta,
  titulo,
  subtitulo,
  children,
}: {
  etiqueta?: string;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="ficha-editorial relative rounded-[22px] overflow-hidden border shadow-[0_22px_60px_-30px_rgba(0,0,0,0.6)]"
      style={{ background: PALETA.paper, borderColor: "rgba(122,18,32,0.18)" }}
    >
      {/* Cabeçalho vinho */}
      <div
        className="relative overflow-hidden px-5 pt-5 pb-6"
        style={{
          background: `linear-gradient(135deg, ${PALETA.wineDeep} 0%, ${PALETA.wine} 100%)`,
        }}
      >
        {/* Cérebro vazado */}
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="absolute -right-2 -top-1 h-[112%] w-auto opacity-[0.16] pointer-events-none"
          fill="none"
          stroke="#fff"
          strokeWidth={3.2}
          strokeLinecap="round"
        >
          <path d="M48 18c-9-6-22-2-24 9-8 3-11 13-6 20-4 7-1 17 8 19 3 8 14 11 22 6" />
          <path d="M52 18c9-6 22-2 24 9 8 3 11 13 6 20 4 7 1 17-8 19-3 8-14 11-22 6" />
          <path d="M50 16v62M36 33h10M64 33H54M34 52h12M66 52H54M40 68h6M60 68h-6" />
        </svg>

        <div className="relative">
          {etiqueta && (
            <p
              className="text-[10px] font-bold uppercase mb-2"
              style={{ color: PALETA.gold, letterSpacing: "0.22em" }}
            >
              {etiqueta}
            </p>
          )}
          <h2
            className="font-display text-[22px] md:text-[26px] font-bold leading-[1.15] tracking-tight"
            style={{ color: "#FFF9F0" }}
          >
            {titulo}
          </h2>
          {subtitulo && (
            <p className="mt-2 text-[12px] font-body" style={{ color: "rgba(255,249,240,0.72)" }}>
              {subtitulo}
            </p>
          )}
        </div>
      </div>

      {/* Fio dourado */}
      <div className="h-[3px] w-full" style={{ background: PALETA.gold }} />

      <div className="px-4 pt-4 pb-3 md:px-5">{children}</div>

      {/* Assinatura */}
      <div
        className="flex items-center justify-end gap-2 px-5 py-3 border-t"
        style={{ borderColor: "rgba(122,18,32,0.14)", background: "rgba(122,18,32,0.035)" }}
      >
        <svg viewBox="0 0 24 28" className="w-4 h-[18px]" fill="none" stroke={PALETA.wine} strokeWidth={1.6}>
          <path d="M12 1.5 22 5v9c0 6.5-4.4 11-10 12.5C6.4 25 2 20.5 2 14V5l10-3.5Z" />
        </svg>
        <div className="text-right leading-tight">
          <p
            className="font-display text-[11px] font-bold tracking-[0.14em]"
            style={{ color: PALETA.wine }}
          >
            DIREITO PRIME
          </p>
          <p className="text-[9px] italic" style={{ color: PALETA.gold }}>
            — Estudos Jurídicos
          </p>
        </div>
      </div>
    </div>
  );
}
