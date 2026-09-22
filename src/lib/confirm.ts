// Equivalente del Alert.alert de dos botones: se llama como una funcion desde
// cualquier handler (`if (!(await confirm({...}))) return;`) para que el port de
// las pantallas moviles sea mecanico y no haya que subir estado por cada dialogo.
//
// Vive aparte del componente: mezclar el host con esta funcion en un mismo
// archivo rompe Fast Refresh (un archivo con exports que no son componentes
// pierde el estado en cada guardado).
export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  /** Pinta el boton de confirmar en rojo (el `style: 'destructive'` de RN). */
  destructive?: boolean;
};

export type Pending = ConfirmOptions & { resolve: (value: boolean) => void };

let emit: ((pending: Pending) => void) | null = null;

/** Lo usa ConfirmHost al montarse para recibir los pedidos. */
export const setConfirmHost = (next: ((pending: Pending) => void) | null) => {
  emit = next;
};

export function confirm(options: ConfirmOptions): Promise<boolean> {
  // Sin host montado nadie puede confirmar: se responde que no, que es el lado
  // seguro de cualquiera de estos dialogos (todos borran o cancelan algo).
  if (!emit) return Promise.resolve(false);
  return new Promise((resolve) => emit!({ ...options, resolve }));
}
