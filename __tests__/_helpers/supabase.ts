/** Mock del cliente de Supabase.
 *
 *  Las queries de la app son cadenas (`from().select().eq().single()`), asi que
 *  el doble devuelve `this` en cada eslabon y resuelve al final. `queue` define
 *  que contesta cada llamada terminal, en orden. */
export type QueryResult = { data?: unknown; error?: unknown };

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

export function createSupabaseMock() {
  const results: QueryResult[] = [];
  const byTable = new Map<string, QueryResult[]>();
  /** Tablas consultadas, en orden: sirve para afirmar QUE se consulto. */
  const tables: string[] = [];

  // Encolar por tabla es lo unico confiable cuando dos efectos de la misma
  // pantalla consultan en paralelo: el orden entre ellos no esta garantizado.
  const next = (table?: string): QueryResult => {
    const queued = table ? byTable.get(table) : undefined;
    if (queued?.length) return queued.shift()!;
    return results.shift() ?? { data: null, error: null };
  };

  const chain = (table?: string) => {
    // El thenable es lo que permite `await query` sin `.single()`: la app lo usa
    // en las listas (select + eq + order).
    const link: Record<string, unknown> = {
      then: (resolve: (value: QueryResult) => unknown) =>
        Promise.resolve(next(table)).then(resolve),
    };
    for (const method of [
      'select', 'insert', 'update', 'eq', 'in', 'ilike', 'order', 'limit',
    ]) {
      link[method] = jest.fn(() => link);
    }
    link.single = jest.fn(() => Promise.resolve(next(table)));
    return link;
  };

  type Channel = {
    on: jest.Mock;
    subscribe: jest.Mock;
    unsubscribe: jest.Mock;
    topic: string;
  };
  const channel: Channel = {
    on: jest.fn(() => channel),
    subscribe: jest.fn(() => channel),
    unsubscribe: jest.fn(),
    topic: '',
  };

  const client = {
    from: jest.fn((table: string) => {
      tables.push(table);
      return chain(table);
    }),
    rpc: jest.fn(() => Promise.resolve(next())),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      updateUser: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
    },
    channel: jest.fn(() => channel),
    getChannels: jest.fn(() => [] as unknown[]),
    removeChannel: jest.fn(),
  };

  return {
    client,
    channel,
    tables,
    /** Encola las respuestas de las proximas llamadas terminales, en orden. */
    queue: (...next: QueryResult[]) => results.push(...next),
    /** Encola solo para esa tabla: usalo cuando la pantalla consulta en paralelo. */
    queueTable: (table: string, ...next: QueryResult[]) => {
      byTable.set(table, [...(byTable.get(table) ?? []), ...next]);
    },
    reset: () => {
      results.length = 0;
      byTable.clear();
      tables.length = 0;
    },
  };
}
