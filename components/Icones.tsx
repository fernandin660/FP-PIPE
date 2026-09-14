// Sistema de ícones da FP Pipe — traço consistente, currentColor, 24x24.
// Substitui emoji como ícone em todo o produto. Apenas ícones funcionais;
// nada de decoração textual.

type PropriedadesIcone = {
  tamanho?: number;
  className?: string;
};

function Base({
  tamanho = 24,
  className,
  children,
}: PropriedadesIcone & { children: React.ReactNode }) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function IconeAlvo(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </Base>
  );
}

export function IconeLista(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3.5 6h.01" />
      <path d="M3.5 12h.01" />
      <path d="M3.5 18h.01" />
    </Base>
  );
}

export function IconeGrafico(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M3 3v18h18" />
      <path d="M8 17V9" />
      <path d="M13 17V5" />
      <path d="M18 17v-4" />
    </Base>
  );
}

export function IconePasta(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </Base>
  );
}

export function IconeBusca(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </Base>
  );
}

export function IconeEnviar(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7" />
    </Base>
  );
}

export function IconeEstrela(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M12 17.3 18.2 21l-1.6-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2l5.4 4.8L5.8 21z" />
    </Base>
  );
}

export function IconeEquipe(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Base>
  );
}

export function IconeCasa(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="m3 10.5 9-7.5 9 7.5" />
      <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
    </Base>
  );
}

export function IconeCartao(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </Base>
  );
}

export function IconeSair(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
      <path d="M12 2v10" />
    </Base>
  );
}

export function IconeSetaDireita(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </Base>
  );
}

export function IconeSetaExterna(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </Base>
  );
}

export function IconeVerificado(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M22 11.1V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 12 2 2 4-4" />
    </Base>
  );
}

export function IconeCopiar(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Base>
  );
}

export function IconeCadeado(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Base>
  );
}

export function IconeEscrever(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </Base>
  );
}

export function IconeEmpresa(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </Base>
  );
}

export function IconeTelefone(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.7a2 2 0 0 1 1.7 2Z" />
    </Base>
  );
}

export function IconeEmail(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 6 10 7L22 6" />
    </Base>
  );
}

export function IconeChevronBaixo(props: PropriedadesIcone) {
  return (
    <Base {...props}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}