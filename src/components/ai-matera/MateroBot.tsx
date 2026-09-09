type MateroBotProps = {
  className?: string;
};

/**
 * Mascota del Agente Matero: un robotito sosteniendo un mate con bombilla.
 * Colores alineados a la paleta de la tienda (bosque, crema, madera y acento lima).
 */
export function MateroBot({ className }: MateroBotProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* Antena */}
      <line x1="24" y1="8" x2="24" y2="4.5" stroke="#20341d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="3" r="2.4" fill="#d7e68c" stroke="#20341d" strokeWidth="1.4" />

      {/* Cabeza */}
      <rect x="9.5" y="7" width="29" height="18" rx="8" fill="#f7f2ea" stroke="#20341d" strokeWidth="2" />
      <rect x="17" y="13" width="4.6" height="6.4" rx="2.3" fill="#20341d" />
      <rect x="26.4" y="13" width="4.6" height="6.4" rx="2.3" fill="#20341d" />
      <circle cx="14.5" cy="19" r="1.3" fill="#d7e68c" />
      <circle cx="33.5" cy="19" r="1.3" fill="#d7e68c" />
      <path d="M20 22.5 Q24 25 28 22.5" stroke="#20341d" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Cuerpo */}
      <rect x="7.5" y="27" width="33" height="15" rx="7.5" fill="#f7f2ea" stroke="#20341d" strokeWidth="2" />

      {/* Brazos */}
      <path d="M7.5 31 C4 32 3.5 38 10 40.5" stroke="#20341d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M40.5 31 C44 32 44.5 38 38 40.5" stroke="#20341d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="11" cy="40" r="2.2" fill="#f7f2ea" stroke="#20341d" strokeWidth="1.8" />
      <circle cx="37" cy="40" r="2.2" fill="#f7f2ea" stroke="#20341d" strokeWidth="1.8" />

      {/* Mate (calabaza) */}
      <path
        d="M14.5 35.5 C14.5 32.5 33.5 32.5 33.5 35.5 C33.5 41 31 44.5 24 44.5 C17 44.5 14.5 41 14.5 35.5 Z"
        fill="#8a5a33"
        stroke="#3b2a1d"
        strokeWidth="1.8"
      />
      {/* Borde del mate (virola) */}
      <ellipse cx="24" cy="34" rx="9" ry="2.6" fill="#3b2a1d" />
      {/* Apertura con yerba */}
      <ellipse cx="24" cy="34" rx="6.4" ry="1.7" fill="#6f8f3a" />

      {/* Bombilla */}
      <line x1="27.5" y1="33.5" x2="34" y2="24.5" stroke="#cfd6c4" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="34.6" cy="23.8" r="1.8" fill="#20341d" />
    </svg>
  );
}
