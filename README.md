# PuntosClub Caja — Web

Port a Next.js de la app Expo `PuntosClubCaja`. Mismas pantallas, mismos
textos y la misma paleta: es la caja para el comercio que no quiere instalar el
APK (o que atiende desde la compu del mostrador).

```bash
npm run dev             # http://localhost:3002
npm run test:watch      # tests en watch
npm run checks          # lint + type-check + cobertura + build + react-doctor
```

Los cinco gates tienen que pasar al 100% antes de subir: la cobertura exige
100% en branches, functions, lines y statements, y react-doctor 100/100.
`/create-pr` los corre en orden y recién después pushea.

Copiá `.env.example` a `.env.local` (mismo proyecto de Supabase que el admin y
las apps móviles).

## Equivalencias con la app móvil

| Móvil (Expo)                  | Web (Next.js)                                  |
| ----------------------------- | ---------------------------------------------- |
| `expo-router` `app/(app)/…`   | App Router, grupos `(app)` / `(auth)`            |
| `(app)/_layout.tsx` (guardia) | `proxy.ts` (sesión) + `(app)/layout.tsx` (rol)   |
| `AsyncStorage` de sesión      | cookies de `@supabase/ssr`                       |
| `AsyncStorage` de idioma      | cookie `NEXT_LOCALE`, sembrada por el proxy      |
| `Alert.alert` de un botón     | toast (`sonner`)                                 |
| `Alert.alert` de dos botones  | `confirm()` (Radix AlertDialog)                  |
| `@expo/vector-icons` Ionicons | `react-icons/io5` (mismo set)                    |
| `expo-camera` + QR            | `getUserMedia` + `@zxing/browser`                |
| `react-native-qrcode-svg`     | `qrcode.react`                                   |
| `StyleSheet` + `constants/theme` | Tailwind v4 (`@theme` en `globals.css`) + `lib/theme.ts` |

Los diccionarios (`src/i18n/es.ts`, `en.ts`) son **copia literal** de los de la
app móvil: si cambia un texto allá, se copia acá. Por eso no se usa `next-intl`
como en el admin — convertirlos a ICU/JSON rompería esa copia 1:1, que es lo que
garantiza que las dos plataformas digan exactamente lo mismo.

## Lo que no se portó, y por qué

- **Ingreso con huella.** En el móvil guarda email + contraseña en SecureStore
  (respaldado por hardware) y la huella sólo destraba la credencial. En web no
  hay equivalente seguro — `localStorage` con una contraseña adentro es un
  agujero, no una función — así que se quitó la tarjeta y su separador. El
  gestor de contraseñas del navegador (y Touch ID / Windows Hello a través de
  él) ya cubre el caso; los inputs tienen los `autocomplete` correctos para eso.
  Si alguna vez hace falta el botón propio, el reemplazo es WebAuthn (passkey)
  contra un token de larga duración emitido por el backend, nunca la contraseña.
- **`signUp` del AuthContext.** Existe en el móvil pero ninguna pantalla lo
  llama (los cajeros los da de alta el admin). No se portó.

## Cómo escala a una ventana grande

No hay "marco de teléfono": las barras superiores van a sangre y cada pantalla
centra su contenido con `.page-column` (definida en `globals.css`). Esa clase es
una grilla de una sola columna `minmax(0, var(--page-w))`, así que **no necesita
ningún media query**: en un teléfono la columna vale el ancho de la pantalla — y
queda idéntica a la app — y en una ventana grande para de crecer y se centra.

Tres anchos, según lo que haya que leer:

| clase | ancho | dónde |
| --- | --- | --- |
| `.page-column` sola | 1120px | listas, tableros, catálogos |
| `+ .page-form` | 560px | formularios y pantallas de resultado |
| `+ .page-read` | 760px | documentos legales |

`ScreenHeader` recibe el mismo ancho por `width=` para que el título quede
alineado con lo de abajo.

De ahí para arriba, las listas pasan a grilla de 2 o 3 columnas (`md:`/`xl:`).
Lo único que **no** se estira son las ilustraciones con la mascota horneada en
el fondo — el hero de la home, el de Explorar y la caja de puntos de la ficha de
organización: llevan tope propio porque estirarlas deforma al robot. El resto
(fondos planos, tarjetas, tipografía) escala solo.

## Detalles que dependen del entorno

- El escáner de QR necesita **HTTPS** (`getUserMedia` no existe en http salvo en
  `localhost`). En Vercel ya viene dado; probándolo por IP de la red local, no.
- El pie de las pantallas muestra `v<package.json> · <commit>`: el commit lo
  inyecta `next.config.ts` desde `VERCEL_GIT_COMMIT_SHA`.
