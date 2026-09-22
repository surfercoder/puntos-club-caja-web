import { LANG_COOKIE, langFromAcceptLanguage, readLangCookie, writeLangCookie } from '@/i18n/cookie';
import { APP_VERSION } from '@/lib/app-version';
import { SUPPORT_EMAIL } from '@/lib/support';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('junta clases condicionales', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('deja ganar a la ultima clase de Tailwind en conflicto', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('cookie de idioma', () => {
  it('acepta solo un idioma soportado', () => {
    expect(readLangCookie('en')).toBe('en');
    expect(readLangCookie('es')).toBe('es');
  });

  it('cae a espanol con cualquier otra cosa', () => {
    expect(readLangCookie('pt')).toBe('es');
    expect(readLangCookie(undefined)).toBe('es');
    expect(readLangCookie(null)).toBe('es');
  });

  it('lee el Accept-Language del navegador', () => {
    expect(langFromAcceptLanguage('en-US,en;q=0.9')).toBe('en');
    expect(langFromAcceptLanguage('  EN-gb  ')).toBe('en');
    expect(langFromAcceptLanguage('es-AR,es;q=0.9')).toBe('es');
    expect(langFromAcceptLanguage(null)).toBe('es');
  });

  it('escribe la cookie con path y max-age', () => {
    writeLangCookie('en');
    expect(document.cookie).toContain(`${LANG_COOKIE}=en`);
  });
});

describe('constantes', () => {
  it('cae a "dev" cuando el build no inyecto la version', () => {
    expect(typeof APP_VERSION).toBe('string');
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });

  it('usa el mismo buzon de soporte que el admin', () => {
    expect(SUPPORT_EMAIL).toBe('soporte@puntosclub.com.ar');
  });
});
