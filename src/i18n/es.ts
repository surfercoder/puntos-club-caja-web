// Fuente de verdad de las claves. `en.ts` esta tipado contra este objeto, asi
// que agregar un mensaje aca y olvidarse del ingles rompe el type-check.
export const es = {
  // --- Comunes -------------------------------------------------------------
  'common.ok': 'OK',
  'common.cancel': 'Cancelar',
  'common.close': 'Cerrar',
  'common.back': 'Volver',
  'common.error': 'Error',
  'common.done': 'Listo',
  'common.understood': 'Entendido',
  'common.yes': 'Sí',
  'common.no': 'No',
  'common.pts': 'pts',
  'common.points': 'puntos',
  'common.point': 'punto',
  'common.noOrganization': 'Sin organización',
  'common.cashier': 'Cajero',
  'common.client': 'Cliente',
  'common.user': 'Usuario',
  'common.active': 'Activo',
  'common.inactive': 'Inactivo',
  'common.noDate': 'Sin fecha',

  // --- Errores -------------------------------------------------------------
  // Nunca exponen el detalle del servidor: dicen el motivo y que hacer.
  'error.unexpected': 'Ocurrió un error inesperado. Intentá nuevamente.',
  'error.network':
    'No pudimos conectarnos. Revisá tu conexión a internet e intentá de nuevo.',

  'error.auth.invalidCredentials':
    'El email o la contraseña no son correctos. Revisalos e intentá de nuevo.',
  'error.auth.emailNotConfirmed':
    'Todavía no confirmaste tu email. Buscá el correo que te enviamos y tocá el enlace para activar tu cuenta.',
  'error.auth.emailExists': 'Ya existe una cuenta registrada con ese email.',
  'error.auth.weakPassword':
    'La contraseña es demasiado débil. Usá al menos 6 caracteres combinando letras y números.',
  'error.auth.samePassword':
    'La contraseña nueva tiene que ser distinta de la actual.',
  'error.auth.emailInvalid': 'Ese email no es válido. Revisá cómo lo escribiste.',
  'error.auth.validationFailed':
    'Faltan datos o alguno no es válido. Revisá el formulario e intentá de nuevo.',
  'error.auth.signupDisabled':
    'El registro no está disponible en este momento. Probá más tarde.',
  'error.auth.userBanned':
    'Esta cuenta está suspendida. Contactá a tu administrador.',
  'error.auth.userNotFound': 'No encontramos una cuenta con ese email.',
  'error.auth.linkExpired':
    'El enlace venció o ya se usó. Pedí uno nuevo e intentá otra vez.',
  'error.auth.sessionExpired':
    'Tu sesión expiró. Volvé a iniciar sesión para continuar.',
  'error.auth.captchaFailed':
    'No pudimos verificar que seas una persona. Intentá de nuevo.',
  'error.auth.reauthNeeded':
    'Por seguridad, volvé a iniciar sesión antes de hacer este cambio.',
  'error.auth.rateLimit':
    'Hiciste demasiados intentos seguidos. Esperá un momento antes de volver a probar.',
  'error.auth.rateLimitSeconds':
    'Por seguridad, esperá {seconds} segundos antes de volver a intentarlo.',
  'error.auth.notCashier':
    'Esta cuenta no está registrada como cajero. Usá la app que corresponde a tu cuenta.',
  'error.auth.noPermission': 'Esta cuenta no tiene permisos de cajero.',
  'error.auth.disabledAccount':
    'Esta cuenta está desactivada. Contactá a tu administrador.',
  'error.auth.signUpFailed':
    'No pudimos crear tu cuenta. Intentá nuevamente en unos minutos.',
  'error.auth.roleLookupFailed':
    'No pudimos obtener el rol de cajero. Intentá nuevamente.',
  'error.auth.organizationNotFound': 'La organización indicada no existe.',
  'error.auth.profileFailed':
    'No pudimos crear tu perfil de cajero. Intentá nuevamente.',

  'error.db.duplicate': 'Ese dato ya está registrado. Revisalo e intentá de nuevo.',
  'error.db.inUse':
    'No se puede completar la operación porque este dato está en uso.',
  'error.db.missingField': 'Faltan datos obligatorios. Revisá el formulario.',
  'error.db.invalidValue': 'Alguno de los datos no es válido. Revisalo e intentá de nuevo.',
  'error.db.forbidden': 'No tenés permiso para hacer esta acción.',
  'error.db.notFound': 'No encontramos lo que buscabas.',

  'error.rpc.outOfStock': 'El producto no tiene stock disponible.',
  'error.rpc.insufficientPoints': 'El cliente no tiene puntos suficientes.',
  'error.rpc.notPending': 'Este canje ya no está pendiente.',
  'error.rpc.redemptionNotFound': 'No encontramos ese canje.',
  'error.rpc.membershipInactive':
    'Este cliente ya no es socio del club. Agregalo de nuevo antes de cargarle puntos.',

  // --- Ingreso -------------------------------------------------------------
  'signIn.title': 'PuntosClub Caja',
  'signIn.subtitle': 'Asigná puntos, creá lealtad',
  'signIn.email': 'Email',
  'signIn.emailPlaceholder': 'tu@email.com',
  'signIn.password': 'Contraseña',
  'signIn.passwordPlaceholder': 'Tu contraseña',
  'signIn.showPassword': 'Mostrar contraseña',
  'signIn.hidePassword': 'Ocultar contraseña',
  'signIn.remember': 'Recordarme',
  'signIn.forgot': '¿Olvidaste tu contraseña?',
  'signIn.submit': 'Iniciar Sesión',
  'signIn.divider': 'o continuá con',
  'signIn.biometric': 'Usar huella digital',
  'signIn.biometricPill': 'Rápido y seguro',
  'signIn.helpTitle': '¿Necesitás ayuda?',
  'signIn.helpSubtitle': 'Escribinos a soporte@puntosclub.com.ar',
  'signIn.helpSubject': 'Ayuda para entrar a PuntosClub Caja',
  'signIn.missingFields': 'Por favor completá todos los campos.',

  'biometric.title': 'Huella digital',
  'biometric.offer': '¿Querés usar tu huella para ingresar la próxima vez?',
  'biometric.later': 'Ahora no',
  'biometric.enable': 'Activar',
  'biometric.notReady':
    'Ingresá una vez con tu email y contraseña para activar el ingreso con huella.',
  'biometric.prompt': 'Ingresá con tu huella digital',

  'forgot.title': 'Recuperar contraseña',
  'forgot.needEmail': 'Escribí tu email arriba y volvé a tocar el enlace.',
  'forgot.sent':
    'Te enviamos un email con el link para crear una nueva contraseña.',

  // --- Inicio --------------------------------------------------------------
  'home.title': 'PuntosClub Caja',
  'home.greeting': '¡Hola, {name}! 👋',
  'home.greetingSub': 'Listo para asignar puntos hoy.',
  'home.organizationLabel': 'ORGANIZACIÓN',
  'home.orgQrLabel': 'Ver QR de la organización',
  'home.notifications': 'Notificaciones',
  'home.notificationsWithCount': 'Notificaciones, {count}',
  'home.noPendingDeliveries': 'No tenés canjes pendientes de entrega.',
  'home.scanClient': 'Escanear Cliente',
  'home.scanClientSub':
    'Escaneá el QR del cliente para registrar ventas o canjes',
  'home.pendingDeliveries': 'Pendientes de entrega',
  'home.pendingWaiting': '{count} esperando entrega',
  'home.searchClient': 'Buscar Cliente',
  'home.searchClientSub': 'Buscá por email o DNI si el cliente no tiene QR a mano',
  'home.rulesTitle': 'Reglas y campañas activas',
  'home.rulesEmpty': 'Todavía no hay reglas configuradas',
  'home.rulesSummary': '{campaigns} y {general} aplicándose ahora',
  'home.rulesView': 'Ver',
  'home.moreOptions': 'Más opciones',
  'home.redemptionHistory': 'Historial de canjes',
  'home.redemptionHistorySub': 'Consultá los últimos canjes realizados',
  'home.helpTitle': '¿Necesitás ayuda?',
  'home.helpSub': 'Escribile por mail al responsable de tu organización',
  'home.edit': 'Editar',
  'home.qrModalTitle': 'QR de {name}',
  'home.qrModalSubtitle': 'Los clientes pueden escanear este código para unirse',
  'home.qrModalHint': 'Tocá fuera del cuadro para cerrar',

  'help.title': 'Ayuda',
  'help.noOwnerEmail':
    'No pudimos encontrar el mail del responsable de tu organización.',
  'help.mailFailed': 'No pudimos abrir tu app de mail. Escribile a {email}',
  'help.subject': 'Consulta de {name} - {organization}',

  'signOut.action': 'Cerrar Sesión',
  'signOut.confirmTitle': 'Cerrar Sesión',
  'signOut.confirmBody': '¿Estás seguro que deseas cerrar sesión?',

  // Plurales que se arman en la home y en las tarjetas.
  'plural.pendingRedemptionOne': '1 canje pendiente',
  'plural.pendingRedemptionMany': '{count} canjes pendientes',
  'plural.redemptionOne': '1 canje',
  'plural.redemptionMany': '{count} canjes',
  'plural.campaignOne': '1 campaña',
  'plural.campaignMany': '{count} campañas',
  'plural.generalRuleOne': '1 regla general',
  'plural.generalRuleMany': '{count} reglas generales',

  // --- Perfil --------------------------------------------------------------
  'profile.header': 'Mi Perfil',
  'profile.title': 'Mi Perfil',
  'profile.subtitle': 'Actualizá tu información personal.',
  'profile.firstName': 'Nombre',
  'profile.lastName': 'Apellido',
  'profile.email': 'Email',
  'profile.emailHint':
    'Para cambiar el email, comunicate con tu responsable o con el administrador.',
  'profile.organization': 'Organización',
  'profile.status': 'Estado',
  'profile.save': 'Guardar Cambios',
  'profile.savedTitle': 'Listo',
  'profile.savedBody': 'Tu perfil se actualizó correctamente.',
  'profile.myProfile': 'Mi perfil',
  'profile.language': 'Idioma',
  'profile.languageEs': 'Español',
  'profile.languageEn': 'English',

  // --- Escáner -------------------------------------------------------------
  'scanner.permissionTitle': 'Permiso de cámara',
  'scanner.permissionBody':
    'Necesitamos acceso a la cámara para escanear códigos QR.',
  'scanner.permissionAction': 'Dar permiso',
  'scanner.instruction': 'Escaneá el código QR del cliente',
  'scanner.invalidQr': 'Código QR no válido.',
  'scanner.invalidId': 'El QR no trae un ID de cliente válido.',
  'scanner.userNotFound':
    'No encontramos a ese cliente. Pedile que abra su QR de nuevo.',
  'scanner.readFailed': 'No pudimos leer el código QR.',

  // --- Buscar cliente ------------------------------------------------------
  'search.header': 'Buscar Cliente',
  'search.title': 'Buscar Cliente',
  'search.subtitle':
    'Encontrá al cliente escaneando su QR{br}o ingresando su email o DNI.',
  'search.modeEmail': 'Email',
  'search.modeDni': 'DNI',
  'search.emailPlaceholder': 'cliente@ejemplo.com',
  'search.dniPlaceholder': 'Número de documento',
  'search.submitLabel': 'Iniciar búsqueda',
  'search.scanTitle': 'Buscar Cliente',
  'search.scanSubtitle': 'Escanear QR del cliente',
  'search.hintTitle': '¿Dónde está el QR?',
  'search.hintSubtitle':
    'El cliente encuentra su QR en la app PuntosClub, en su perfil.',
  'search.requiredTitle': 'Campo requerido',
  'search.requiredEmail': 'Por favor ingresá un email para buscar.',
  'search.requiredDni': 'Por favor ingresá un DNI para buscar.',
  'search.notFoundTitle': 'No encontrado',
  'search.notFoundEmail': 'No existe un cliente registrado con ese email.',
  'search.notFoundDni': 'No existe un cliente registrado con ese DNI.',

  // --- Cliente escaneado ---------------------------------------------------
  'client.foundTitle': 'Cliente Encontrado',
  'client.scannedTitle': 'Cliente Escaneado',
  'client.member': 'MIEMBRO ACTIVO',
  'client.notMember': 'NO ES MIEMBRO',
  'client.availablePoints': 'Puntos disponibles',
  'client.noRulesWarning':
    'Tu organización todavía no tiene reglas de puntos. Pedile a un administrador que cree una antes de registrar ventas.',
  'client.newSale': 'Nueva Venta',
  'client.inviteMessage':
    'Este cliente no pertenece a tu organización. Podés invitarlo para que empiece a acumular puntos.',
  'client.inviteAction': 'Invitar Cliente',
  'client.inviteMissingData': 'Faltan datos para invitar al cliente.',
  'client.inviteFailed': 'No pudimos agregar al cliente. Intentá nuevamente.',
  'client.invitedTitle': 'Cliente agregado',
  'client.invitedBody': '{name} ahora es miembro de tu organización.',
  'client.scanAnotherMember': 'Escanear otro cliente',
  'client.scanAnother': 'Escanear otro',
  'client.verifiedTitle': 'Cliente verificado correctamente',
  'client.verifiedBody': 'Podés registrar ventas.',
  'client.goHome': 'Volver al inicio',

  // --- Nueva venta ---------------------------------------------------------
  'sale.header': 'Nueva Venta',
  'sale.currentPoints': '{points} pts actuales',
  'sale.amountLabel': 'Monto de la compra',
  'sale.amountHint': 'Ingresá el monto total de la compra',
  'sale.previewLabel': 'Puntos a ganar',
  'sale.submit': 'Registrar Venta',
  'sale.invalidAmount': 'Por favor ingresá un monto válido.',
  'sale.missingData': 'Faltan datos. Escaneá al cliente nuevamente.',
  'sale.registerFailed': 'No pudimos registrar la venta. Intentá nuevamente.',
  'sale.confirmTitle': 'Confirmá la asignación',
  'sale.confirmLead': 'Estás por asignar',
  'sale.confirmUnitOne': 'punto a {name}',
  'sale.confirmUnitMany': 'puntos a {name}',
  'sale.confirmAmountLabel': 'Monto de la compra',
  'sale.confirmHint':
    'Si el número no es el que esperabas, cancelá y revisá el monto antes de registrar.',
  'sale.confirmAction': 'Confirmar y registrar',
  'sale.confirmCancel': 'Cancelar y corregir',
  'sale.successHeader': 'Venta Registrada',
  'sale.successTitle': '¡Venta exitosa!',
  'sale.pointsEarned': 'Puntos ganados',
  'sale.detailAmount': 'Monto de compra',
  'sale.scanAnother': 'Escanear Otro',
  'sale.finish': 'Finalizar',
  'sale.note': 'Venta desde app caja',
  // "{value} {unit} de compra" — bajada verde con la regla de fondo.
  'sale.rateSuffix': '{rate} de compra',

  // --- Canjes y entregas ---------------------------------------------------
  'redemptions.header': 'Canjes y entregas',
  'redemptions.tabPending': 'Pendientes',
  'redemptions.tabDelivered': 'Entregados',
  'redemptions.tabCancelled': 'Cancelados',
  'redemptions.banner':
    'Estos canjes están pendientes de entrega.\nEntregá los premios y registrá la entrega para actualizar los puntos del cliente.',
  'redemptions.dismissBanner': 'Cerrar aviso',
  'redemptions.pendingTitle': 'Pendientes de entrega',
  'redemptions.pendingUnit': 'pendientes',
  'redemptions.pendingEmptyTitle': 'No hay canjes pendientes',
  'redemptions.pendingEmptyBody': 'Cuando un cliente pida un canje aparece acá.',
  'redemptions.deliveredTitle': 'Canjes entregados',
  'redemptions.deliveredUnit': 'entregados',
  'redemptions.deliveredEmptyTitle': 'Todavía no hay entregas',
  'redemptions.deliveredEmptyBody':
    'Los canjes que entregues van a quedar registrados acá.',
  'redemptions.cancelledTitle': 'Canjes cancelados',
  'redemptions.cancelledUnit': 'cancelados',
  'redemptions.cancelledEmptyTitle': 'Todavía no hay cancelaciones',
  'redemptions.cancelledEmptyBody':
    'Los canjes cancelados quedan acá para dejar registro.',
  'redemptions.product': 'Producto',
  'redemptions.requestedAt': 'Solicitado: {date}',
  'redemptions.deliveredAt': 'Entregado: {date}',
  'redemptions.cancelledAt': 'Cancelado: {date}',
  'redemptions.deliver': 'Entregar',
  'redemptions.cancel': 'Cancelar',
  'redemptions.deliverFailed': 'No se pudo entregar',
  'redemptions.cancelFailed': 'No se pudo cancelar',
  'redemptions.cancelConfirmTitle': 'Cancelar canje',
  'redemptions.cancelConfirmBody':
    '¿Confirmás la cancelación? Se le devuelven los puntos al cliente y se restaura el stock.',
  'redemptions.cancelConfirmAction': 'Sí, cancelar',
  'redemptions.cancelReason': 'Cancelado por cajero',

  // --- Reglas y campañas ---------------------------------------------------
  'rules.header': 'Reglas y campañas activas',
  'rules.bannerTitle':
    'Estas reglas determinan cómo se asignan los puntos y cómo se pueden canjear.',
  'rules.bannerSubtitle': 'Solo podés consultarlas. No se pueden modificar.',
  'rules.motherSection': 'Regla madre',
  'rules.alwaysActive': 'Siempre activa',
  'rules.validity': 'Vigencia',
  'rules.appliesTo': 'Aplica a',
  'rules.allTransactions': 'todas las transacciones',
  'rules.start': 'Inicio',
  'rules.end': 'Fin',
  'rules.whenApplies': 'Cuándo aplica',
  'rules.activeCampaigns': 'Campañas activas',
  'rules.campaigns': 'Campañas',
  'rules.otherRules': 'Otras reglas',
  'rules.emptyTitle': 'Todavía no hay reglas activas',
  'rules.emptyBody':
    'Las reglas y campañas se cargan desde el panel de administración de la organización.',
  'rules.helpTitle': '¿Tenés dudas?',
  'rules.helpBody':
    'Consultá al administrador del programa o al responsable de tu organización.',
  'rules.statusActive': 'Campaña',
  'rules.statusScheduled': 'Programada',
  'rules.statusEnded': 'Terminada',

  // Textos que arma utils/points-rules a partir de la config de la regla.
  'rule.unknownValue': 'Puntos',
  'rule.unknownUnit': 'según configuración',
  'rule.perSale': 'por venta',
  'rule.perDollar': 'por cada $1',
  'rule.percentOfAmount': 'del monto en puntos',
  'rule.perItem': 'por artículo',
  'rule.tieredUnit': 'por niveles de compra',
  'rule.tieredBadge': 'Nivel',
  'rule.pointsValueOne': '{points} punto',
  'rule.pointsValueMany': '{points} puntos',
  'rule.periodBetween': 'Del {from} al {to}',
  'rule.periodFrom': 'Desde el {from}',
  'rule.periodUntil': 'Hasta el {to}',
  'rule.periodAlways': 'Desde siempre',
  'rule.timeRange': '{from} a {to}',

  'day.0': 'Dom',
  'day.1': 'Lun',
  'day.2': 'Mar',
  'day.3': 'Mié',
  'day.4': 'Jue',
  'day.5': 'Vie',
  'day.6': 'Sáb',
} as const;
