import { getNameFrame } from '../lib/frames';

/** Nome do piloto com a moldura escolhida (sem moldura, texto normal). */
export default function PilotName({ name, style, className = '' }: { name: string; style?: string; className?: string }) {
  const f = getNameFrame(style);
  if (!f) return <span className={className}>{name}</span>;
  return (
    <span className={`inline-flex items-center gap-1 max-w-full ${f.frame ?? ''} ${className}`}>
      {f.badge && <span className="not-italic shrink-0" aria-hidden>{f.badge}</span>}
      <span className={`truncate ${f.text}`} style={f.textStyle}>{name}</span>
    </span>
  );
}
