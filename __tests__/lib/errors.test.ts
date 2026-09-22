import { translate, type MessageKey } from '@/i18n';
import { errorDescriptor, errorMessage } from '@/lib/errors';

const t = (key: MessageKey, params?: Record<string, string | number>) =>
  translate('es', key, params);

describe('rate limit', () => {
  it.each([
    'over_email_send_rate_limit',
    'over_request_rate_limit',
    'over_sms_send_rate_limit',
  ])('reconoce el codigo %s', (code) => {
    expect(errorDescriptor({ code })).toEqual({ key: 'error.auth.rateLimit' });
  });

  it('tambien entra por el status 429', () => {
    expect(errorDescriptor({ status: 429 })).toEqual({
      key: 'error.auth.rateLimit',
    });
  });

  it('saca los segundos del texto, que es el unico lugar donde viajan', () => {
    expect(
      errorDescriptor({
        status: 429,
        message: 'For security purposes, you can only request this after 60 seconds',
      }),
    ).toEqual({ key: 'error.auth.rateLimitSeconds', params: { seconds: 60 } });
  });

  it('acepta el singular "after 1 second"', () => {
    expect(
      errorDescriptor({ status: 429, message: 'request this after 1 second' }),
    ).toEqual({ key: 'error.auth.rateLimitSeconds', params: { seconds: 1 } });
  });
});

describe('codigos de GoTrue', () => {
  it.each([
    ['invalid_credentials', 'error.auth.invalidCredentials'],
    ['email_not_confirmed', 'error.auth.emailNotConfirmed'],
    ['user_already_exists', 'error.auth.emailExists'],
    ['weak_password', 'error.auth.weakPassword'],
    ['session_expired', 'error.auth.sessionExpired'],
    ['otp_expired', 'error.auth.linkExpired'],
    ['user_banned', 'error.auth.userBanned'],
    ['request_timeout', 'error.network'],
    ['reauthentication_needed', 'error.auth.reauthNeeded'],
  ])('%s -> %s', (code, key) => {
    expect(errorDescriptor({ code })).toEqual({ key });
  });
});

describe('SQLSTATE de PostgREST', () => {
  it.each([
    ['23505', 'error.db.duplicate'],
    ['23503', 'error.db.inUse'],
    ['23502', 'error.db.missingField'],
    ['23514', 'error.db.invalidValue'],
    ['42501', 'error.db.forbidden'],
    ['PGRST116', 'error.db.notFound'],
    ['PGRST301', 'error.auth.sessionExpired'],
  ])('%s -> %s', (code, key) => {
    expect(errorDescriptor({ code })).toEqual({ key });
  });

  it('nunca filtra el detalle del error de base', () => {
    const { key } = errorDescriptor({
      code: '23505',
      message: 'duplicate key value violates unique constraint "purchase_pkey"',
    });
    expect(t(key)).not.toContain('purchase_pkey');
  });
});

describe('excepciones de las funciones del backend', () => {
  it.each([
    ['OUT_OF_STOCK', 'error.rpc.outOfStock'],
    ['INSUFFICIENT_POINTS', 'error.rpc.insufficientPoints'],
    ['REDEMPTION_NOT_PENDING', 'error.rpc.notPending'],
    ['REDEMPTION_NOT_FOUND', 'error.rpc.redemptionNotFound'],
    ['MEMBERSHIP_INACTIVE', 'error.rpc.membershipInactive'],
  ])('encuentra %s dentro del message', (token, key) => {
    expect(errorDescriptor({ message: `ERROR: ${token} (SQLSTATE P0001)` })).toEqual(
      { key },
    );
  });
});

describe('red', () => {
  it.each(['Network request failed', 'Failed to fetch'])(
    'reconoce "%s"',
    (message) => {
      expect(errorDescriptor(new TypeError(message))).toEqual({
        key: 'error.network',
      });
    },
  );

  it('un TypeError que no es de red no se disfraza de problema de conexion', () => {
    expect(errorDescriptor(new TypeError('x is not a function'))).toEqual({
      key: 'error.unexpected',
    });
  });
});

describe('claves de i18n envueltas en un Error', () => {
  it('reconoce la clave por el diccionario', () => {
    expect(errorDescriptor(new Error('error.network'))).toEqual({
      key: 'error.network',
    });
  });

  it('se lleva los params colgados del Error', () => {
    const error = Object.assign(new Error('error.auth.rateLimitSeconds'), {
      params: { seconds: 30 },
    });
    expect(errorDescriptor(error)).toEqual({
      key: 'error.auth.rateLimitSeconds',
      params: { seconds: 30 },
    });
  });

  it('ignora params que no son un objeto', () => {
    const error = Object.assign(new Error('error.network'), { params: 'nope' });
    expect(errorDescriptor(error)).toEqual({ key: 'error.network' });
  });
});

describe('fallback', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['objeto vacio', {}],
    ['codigo desconocido', { code: 'lo_que_sea' }],
    ['code que no es string', { code: 500 }],
    ['message que no es string', { message: 123 }],
  ])('%s cae en el generico', (_label, error) => {
    expect(errorDescriptor(error)).toEqual({ key: 'error.unexpected' });
  });
});

describe('errorMessage', () => {
  it('traduce al idioma activo', () => {
    expect(errorMessage(t, { code: 'invalid_credentials' })).toBe(
      translate('es', 'error.auth.invalidCredentials'),
    );
  });

  it('interpola los params', () => {
    expect(errorMessage(t, { status: 429, message: 'after 45 seconds' })).toContain(
      '45',
    );
  });
});
