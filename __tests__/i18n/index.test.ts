import {
  DEFAULT_LANG,
  en,
  es,
  getActiveLang,
  isLang,
  isMessageKey,
  LANGS,
  setActiveLang,
  translate,
} from '@/i18n';

afterEach(() => setActiveLang(DEFAULT_LANG));

describe('diccionarios', () => {
  it('tiene exactamente las mismas claves en es y en', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it('no deja ningun mensaje vacio', () => {
    for (const [lang, dict] of [['es', es], ['en', en]] as const) {
      for (const [key, value] of Object.entries(dict)) {
        expect(`${lang}:${key}:${value.trim()}`).not.toBe(`${lang}:${key}:`);
      }
    }
  });

  it('usa los mismos placeholders {x} en los dos idiomas', () => {
    const holders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();
    for (const key of Object.keys(es) as (keyof typeof es)[]) {
      expect({ key, holders: holders(en[key]) }).toEqual({
        key,
        holders: holders(es[key]),
      });
    }
  });
});

describe('isLang / isMessageKey', () => {
  it('acepta solo los idiomas soportados', () => {
    expect(LANGS).toEqual(['es', 'en']);
    expect(isLang('es')).toBe(true);
    expect(isLang('en')).toBe(true);
    expect(isLang('pt')).toBe(false);
    expect(isLang(undefined)).toBe(false);
  });

  it('reconoce una clave del diccionario', () => {
    expect(isMessageKey('common.back')).toBe(true);
    expect(isMessageKey('no.existe')).toBe(false);
    expect(isMessageKey(42)).toBe(false);
  });
});

describe('translate', () => {
  it('devuelve el mensaje del idioma pedido', () => {
    expect(translate('es', 'common.back')).toBe(es['common.back']);
    expect(translate('en', 'common.back')).toBe(en['common.back']);
  });

  it('interpola los parametros', () => {
    expect(translate('es', 'home.qrModalTitle', { name: 'Churrico' })).toContain(
      'Churrico',
    );
  });

  it('deja el placeholder crudo si falta el parametro', () => {
    expect(translate('es', 'home.qrModalTitle', {})).toContain('{name}');
  });

  it('cae a espanol si el idioma no tiene la clave', () => {
    const key = 'common.back' as const;
    expect(
      translate('es', key, undefined) && translate('en', key, undefined),
    ).toBeTruthy();
  });
});

describe('idioma activo', () => {
  it('arranca en espanol y se puede cambiar', () => {
    expect(getActiveLang()).toBe('es');
    setActiveLang('en');
    expect(getActiveLang()).toBe('en');
  });
});
