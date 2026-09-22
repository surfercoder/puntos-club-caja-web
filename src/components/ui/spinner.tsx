import { cn } from '@/lib/utils';

// Equivalente del ActivityIndicator de RN: el mismo circulo girando, del color
// que le pase la pantalla.
export function Spinner({
  size = 20,
  color = 'currentColor',
  className,
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <span
      role="progressbar"
      aria-label="…"
      className={cn('inline-block animate-spin rounded-full', className)}
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, Math.round(size / 10)),
        borderStyle: 'solid',
        borderColor: color,
        borderTopColor: 'transparent',
      }}
    />
  );
}

/** Pantalla completa en blanco con el spinner al medio (el estado `loading`). */
export function FullScreenSpinner({ color }: { color?: string }) {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg">
      <Spinner size={36} color={color} />
    </div>
  );
}
