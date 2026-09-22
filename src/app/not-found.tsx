import Link from 'next/link';

// Equivalente del app/+not-found.tsx de la app movil.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <p className="text-[20px] font-bold text-ink">404</p>
      <Link
        href="/"
        className="pressable rounded-xl bg-green-card px-6 py-3 text-[16px] font-semibold text-white"
      >
        PuntosClub Caja
      </Link>
    </div>
  );
}
