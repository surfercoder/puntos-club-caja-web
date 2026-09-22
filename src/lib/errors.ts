// Supabase nunca traduce: GoTrue y PostgREST responden siempre en ingles
// ("Email not confirmed", "For security purposes, you can only request this
// after 60 seconds"). Mostrarlos tal cual es el bug del ticket, asi que todo
// error de servidor entra por aca y sale como clave de i18n.
//
// Se mapea por `code`, no por el texto: el texto cambia entre versiones de
// GoTrue, el codigo no. El texto solo se usa para sacar los segundos del rate
// limit, que es informacion util para el usuario.
import { isMessageKey, type MessageKey, type Translate } from '@/i18n';

type Descriptor = { key: MessageKey; params?: Record<string, string | number> };

// Codigos de GoTrue (@supabase/auth-js ErrorCode). Solo los que un beneficiario
// puede llegar a ver; el resto cae en el generico.
const AUTH_CODES: Record<string, MessageKey> = {
  invalid_credentials: 'error.auth.invalidCredentials',
  email_not_confirmed: 'error.auth.emailNotConfirmed',
  user_already_exists: 'error.auth.emailExists',
  email_exists: 'error.auth.emailExists',
  identity_already_exists: 'error.auth.emailExists',
  weak_password: 'error.auth.weakPassword',
  same_password: 'error.auth.samePassword',
  email_address_invalid: 'error.auth.emailInvalid',
  email_address_not_authorized: 'error.auth.emailInvalid',
  validation_failed: 'error.auth.validationFailed',
  signup_disabled: 'error.auth.signupDisabled',
  email_provider_disabled: 'error.auth.signupDisabled',
  provider_disabled: 'error.auth.signupDisabled',
  user_banned: 'error.auth.userBanned',
  user_not_found: 'error.auth.userNotFound',
  otp_expired: 'error.auth.linkExpired',
  flow_state_expired: 'error.auth.linkExpired',
  bad_code_verifier: 'error.auth.linkExpired',
  session_expired: 'error.auth.sessionExpired',
  session_not_found: 'error.auth.sessionExpired',
  refresh_token_not_found: 'error.auth.sessionExpired',
  refresh_token_already_used: 'error.auth.sessionExpired',
  bad_jwt: 'error.auth.sessionExpired',
  captcha_failed: 'error.auth.captchaFailed',
  request_timeout: 'error.network',
  reauthentication_needed: 'error.auth.reauthNeeded',
};

// SQLSTATE de PostgREST. Nunca se muestra el detalle: trae nombres de tablas y
// de constraints, que es justo lo que el ticket pide no exponer.
const PG_CODES: Record<string, MessageKey> = {
  '23505': 'error.db.duplicate',
  '23503': 'error.db.inUse',
  '23502': 'error.db.missingField',
  '23514': 'error.db.invalidValue',
  '42501': 'error.db.forbidden',
  PGRST116: 'error.db.notFound',
  PGRST301: 'error.auth.sessionExpired',
};

// Excepciones que levantan las funciones del backend (RAISE EXCEPTION). Llegan
// como texto porque Postgres las manda en el message, no en el code.
const RPC_TOKENS: [string, MessageKey][] = [
  ['OUT_OF_STOCK', 'error.rpc.outOfStock'],
  ['INSUFFICIENT_POINTS', 'error.rpc.insufficientPoints'],
  ['REDEMPTION_NOT_PENDING', 'error.rpc.notPending'],
  ['REDEMPTION_NOT_FOUND', 'error.rpc.redemptionNotFound'],
  ['MEMBERSHIP_INACTIVE', 'error.rpc.membershipInactive'],
];

const asRecord = (error: unknown) =>
  (error ?? {}) as {
    code?: unknown;
    status?: unknown;
    message?: unknown;
    params?: unknown;
  };

const isParams = (value: unknown): value is Record<string, string | number> =>
  typeof value === 'object' && value !== null;

// "you can only request this after 60 seconds" -> 60. Si el texto cambia y no
// matchea, el mensaje generico de rate limit sigue siendo correcto.
const secondsFrom = (message: string): number | undefined => {
  const found = /after (\d+) seconds?/i.exec(message);
  return found ? Number(found[1]) : undefined;
};

export function errorDescriptor(error: unknown): Descriptor {
  const { code, status, message, params } = asRecord(error);
  const text = typeof message === 'string' ? message : '';
  const codeText = typeof code === 'string' ? code : '';

  // El rate limit va primero: el usuario necesita saber cuanto esperar, y ese
  // dato solo esta en el texto.
  if (
    codeText === 'over_email_send_rate_limit' ||
    codeText === 'over_request_rate_limit' ||
    codeText === 'over_sms_send_rate_limit' ||
    status === 429
  ) {
    const seconds = secondsFrom(text);
    return seconds
      ? { key: 'error.auth.rateLimitSeconds', params: { seconds } }
      : { key: 'error.auth.rateLimit' };
  }

  if (AUTH_CODES[codeText]) return { key: AUTH_CODES[codeText] };
  if (PG_CODES[codeText]) return { key: PG_CODES[codeText] };

  for (const [token, key] of RPC_TOKENS) {
    if (text.includes(token)) return { key };
  }

  // Sin conexion: fetch rechaza con TypeError "Network request failed". Se
  // matchea el texto y no `name === 'TypeError'`: un TypeError cualquiera es un
  // bug nuestro y decirle al cajero "revisa tu conexion" lo manda a buscar
  // donde no es.
  if (/network request failed|failed to fetch/i.test(text)) {
    return { key: 'error.network' };
  }

  // AuthContext y los utils devuelven claves de i18n dentro de un Error, para
  // que el llamador decida donde mostrarlas. Se reconoce por el diccionario, no
  // por la forma del string: un mensaje ingles tambien tiene puntos. Los params
  // viajan colgados del Error: sin ellos el texto sale con el "{seconds}" crudo.
  if (isMessageKey(text)) {
    return isParams(params) ? { key: text, params } : { key: text };
  }

  return { key: 'error.unexpected' };
}

/** Traduce cualquier error de servidor al idioma activo. */
export function errorMessage(t: Translate, error: unknown): string {
  const { key, params } = errorDescriptor(error);
  return t(key, params);
}
