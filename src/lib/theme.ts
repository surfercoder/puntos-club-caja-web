import { getActiveLang } from '@/i18n';

// Espejo en JS de los tokens de src/app/globals.css. Existe porque hay lugares
// donde el color no puede ser una clase de Tailwind: el `color` de un icono de
// react-icons, un degrade inline, el atributo de un <svg>.
export const colors = {
  bg: '#FBFBFC',
  card: '#FFFFFF',

  green: '#02875B',       // barras superiores
  greenCard: '#059366',   // hero de la home, botones primarios
  greenBright: '#099149', // titulo del login
  greenSoft: '#D7F1E4',   // cuadrados de icono y pastillas
  greenTint: '#ECF8F2',   // tarjetas de aviso
  greenLine: '#BEE7D3',
  greenField: '#CBE0D5',  // borde verdoso de los campos del login
  greenInk: '#07814A',    // texto y links verdes sobre fondo claro
  onGreen: 'rgba(255,255,255,0.22)',

  orange: '#D97706',
  orangeSoft: '#FEF3E7',
  orangeTint: '#FDF3E6',
  orangeLine: '#F5CFA0',
  orangeInk: '#92400E',

  danger: '#DC2626',
  dangerSoft: '#FDE9E9',
  dangerLine: '#F0A7A7',

  ink: '#111827',
  inkSoft: '#374151',
  muted: '#6B7280',
  subtle: '#9CA3AF',
  line: '#E5E7EB',
  lineSoft: '#F3F4F6',
  disabled: '#F3F4F6',

  authBg: '#F9FCFB',
} as const;

// El mockup separa "2,000 pts" con coma. Se arma a mano igual que en movil: el
// mockup es en espanol pero usa coma, y en ingles la coma tambien es correcta.
export const formatPoints = (n: number) =>
  String(n ?? 0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const pad2 = (n: number) => String(n).padStart(2, '0');

// Unico lugar donde se decide el orden de la fecha: espanol d/m/a, ingles m/d/a.
export const formatDMY = (day: number, month: number, year: number) =>
  getActiveLang() === 'en' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;

// "13/8/2026, 12:29:09" — formato exacto de la fila "Solicitado:" del mockup.
export const formatRequestedAt = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const date = formatDMY(d.getDate(), d.getMonth() + 1, d.getFullYear());
  return `${date}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};

// Iniciales del avatar de la home ("ED"). Cae al email si no hay nombre.
export const initials = (first?: string | null, last?: string | null, email?: string | null) => {
  const letters = `${first?.[0] ?? ''}${last?.[0] ?? ''}`.trim();
  return (letters || email?.[0] || '?').toUpperCase();
};
