import type { PointsBreakdownRow } from '@/lib/points-rules';

// La venta ya calculada y esperando el OK del cajero: es la fila que se va a
// insertar tal cual. Los puntos que se guardan son estos mismos, no un
// recalculo, asi que lo que el cajero confirma es exactamente lo que se asigna.
export type PendingSale = {
  // Clave de idempotencia: la misma en cada reintento de esta venta.
  requestId: string;
  points: number;
  breakdown: PointsBreakdownRow[];
  amount: number;
  // Se fija al abrir el dialogo: es la que se guarda y la que muestra el recibo.
  reference: string | null;
  branchId: number | null;
  beneficiaryId: number;
  cashierId: number;
  organizationId: number;
};

// Las ventas cuyo insert no termino bien: pueden estar guardadas. Si el cajero
// vuelve a cargar la MISMA venta, reusa su clave para que el unique de
// client_request_id no la duplique. Se reabre tal cual (clave, puntos,
// referencia): es lo que puede haber quedado guardado. Vive en el modulo y no en
// el screen para sobrevivir al "Cancelar" que sale de la pantalla, y es un Map
// para que la venta B no pise a la A. Se marca antes del insert y se borra solo
// con un exito: un error del reintento no prueba que el original fallo.
// Vencen a los 5 minutos del ultimo intento (decision de producto del
// 26/11/2026): cubre "vencio, cancelo y la volvi a cargar" sin comerse una venta
// identica legitima mas tarde, que tiene que registrarse como nueva.
// ponytail: en memoria, se pierde al recargar o cerrar la pestaña (decision del
// usuario: nada de localStorage).
export const UNRESOLVED_TTL_MS = 5 * 60_000;

type Entry = { sale: PendingSale; at: number };
const entries = new Map<string, Entry>();

export const unresolvedSales = {
  get(signature: string): PendingSale | undefined {
    const entry = entries.get(signature);
    if (!entry) return undefined;
    if (Date.now() - entry.at > UNRESOLVED_TTL_MS) {
      entries.delete(signature);
      return undefined;
    }
    return entry.sale;
  },
  has(signature: string): boolean {
    return unresolvedSales.get(signature) !== undefined;
  },
  // Devuelve el intento: es la ficha para borrarlo despues. Si mientras el insert
  // viajaba otra pantalla reintento la misma venta, ese intento es el dueño y un
  // exito tardio del viejo no se lo lleva (si el reintento vence, la clave sigue).
  set(signature: string, sale: PendingSale): Entry {
    const entry = { sale, at: Date.now() };
    entries.set(signature, entry);
    return entry;
  },
  delete(signature: string, attempt: Entry) {
    if (entries.get(signature) === attempt) entries.delete(signature);
  },
  clear() {
    entries.clear();
  },
};
