import { setActiveLang } from '@/i18n';
import {
  colors,
  formatDMY,
  formatPoints,
  formatRequestedAt,
  initials,
} from '@/lib/theme';

afterEach(() => setActiveLang('es'));

describe('formatPoints', () => {
  it('separa los miles con coma, como el mockup', () => {
    expect(formatPoints(2000)).toBe('2,000');
    expect(formatPoints(1234567)).toBe('1,234,567');
  });

  it('no toca los numeros de menos de cuatro cifras', () => {
    expect(formatPoints(0)).toBe('0');
    expect(formatPoints(999)).toBe('999');
  });

  it('cae a 0 si le llega null o undefined', () => {
    expect(formatPoints(null as unknown as number)).toBe('0');
    expect(formatPoints(undefined as unknown as number)).toBe('0');
  });
});

describe('formatDMY', () => {
  it('usa dia/mes/anio en espanol', () => {
    setActiveLang('es');
    expect(formatDMY(1, 9, 2026)).toBe('1/9/2026');
  });

  it('usa mes/dia/anio en ingles', () => {
    setActiveLang('en');
    expect(formatDMY(1, 9, 2026)).toBe('9/1/2026');
  });
});

describe('formatRequestedAt', () => {
  it('arma fecha y hora con dos digitos', () => {
    const iso = new Date(2026, 7, 13, 12, 29, 9).toISOString();
    expect(formatRequestedAt(iso)).toBe('13/8/2026, 12:29:09');
  });

  it('devuelve el valor crudo si no es una fecha', () => {
    expect(formatRequestedAt('no-es-fecha')).toBe('no-es-fecha');
  });
});

describe('initials', () => {
  it('toma la inicial del nombre y del apellido', () => {
    expect(initials('Elena', 'Diaz')).toBe('ED');
  });

  it('se conforma con lo que haya', () => {
    expect(initials('Elena', null)).toBe('E');
    expect(initials(null, 'Diaz')).toBe('D');
  });

  it('cae al email cuando no hay nombre', () => {
    expect(initials(null, null, 'cajero@puntosclub.com.ar')).toBe('C');
  });

  it('cae a ? cuando no hay nada', () => {
    expect(initials()).toBe('?');
    expect(initials('', '', '')).toBe('?');
  });
});

describe('tokens', () => {
  it('expone la paleta', () => {
    expect(colors.green).toBe('#02875B');
  });
});
