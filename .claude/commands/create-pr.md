---
description: Corre todos los gates de calidad (lint, types, coverage 100%, build, react-doctor 100/100, ponytail-review, CodeRabbit) y recién ahí pushea a main
argument-hint: [mensaje de commit opcional]
---

Llevá el trabajo pendiente hasta main pasando **todos** los gates. Mensaje de commit sugerido por el usuario: $ARGUMENTS

No pushees hasta que cada gate esté en verde. Si un gate falla, arreglá el código y **volvé a correr los gates desde el principio** — un fix puede romper otro gate.

## Fase 1 — gates automáticos

Corré estos cinco en paralelo (un solo mensaje, varias llamadas a Bash):

```
npm run lint
npm run type-check
npm run test:coverage
npm run build
npx react-doctor --score
```

Criterio de aprobación, sin excepciones:

- **lint**: 0 errores y 0 warnings.
- **type-check**: 0 errores. Nunca `@ts-ignore`, `@ts-expect-error`, `any`, `!` para tapar un error, ni aflojar `tsconfig.json`. Si el tipo no cierra, el problema es el código: modelalo bien (union discriminada, type guard, `unknown` + narrowing).
- **test:coverage**: 100% en branches, functions, lines y statements (el umbral ya está en `jest.config.ts`). Cubrí con tests reales; `/* v8 ignore */` sólo para ramas físicamente inalcanzables y con el motivo escrito al lado.
- **build**: sin errores ni warnings.
- **react-doctor**: 100/100, sin warnings. Para ver qué falta: `npx react-doctor --verbose`. Los overrides de `doctor.config.json` son decisiones deliberadas y cada uno lleva su motivo escrito; no agregues uno nuevo para tapar un hallazgo real.

Prohibido pasar un gate silenciando la regla (`eslint-disable`, `react-doctor-disable`, bajar un threshold). Si una supresión es genuinamente correcta, dejá el comentario explicando por qué y avisale al usuario en el resumen final.

### Específico de esta app

- Es el port 1:1 de `PuntosClubCaja` (Expo). Antes de cambiar una pantalla, mirá la nativa: si el comportamiento difiere sin motivo, el bug puede estar en el port.
- El i18n tiene test de paridad `es`/`en`: si agregás una clave, va en los dos archivos o falla.
- Ningún dato personal del cliente puede viajar en la URL. Entre pantallas va sólo `beneficiaryId`; el nombre, el email y los puntos los carga el destino con `loadBeneficiaryCard`.
- Ningún botón de volver usa `router.back()`: sin historial propio (link directo, PWA, pestaña nueva) no hace nada. Siempre un destino explícito.

## Fase 2 — reviews

Recién con la Fase 1 en verde, corré los dos reviews en paralelo:

1. `/ponytail-review` sobre el diff — código simple, seguro, performante, testeable, sin abstracciones especulativas.
2. `coderabbit review --agent --uncommitted --include-untracked` (si ya commiteaste, usá `--base main` o `--committed`).

Aplicá cada sugerencia de ambos. Si estás en desacuerdo con alguna, no la apliques calladamente: decilo en el resumen con el motivo. Después de aplicar fixes, **volvé a la Fase 1**.

## Fase 3 — push a main

Proyecto de un solo dev: se pushea directo a `main`, sin branch ni PR.

1. `git status` y `git diff` para revisar qué entra. Incluí el bloque de `AGENTS.md` si `next dev` lo regeneró.
2. `git add` de lo que corresponde (nada de secretos, `.env`, `coverage/`, ni artefactos de build).
3. Commit con el mensaje de $ARGUMENTS, o uno propio que describa el *por qué* del cambio si no lo pasaron.
4. `git push origin main`.

## Resumen final

Cerrá con, como máximo:

- Estado de cada gate (lint / types / coverage / build / react-doctor / ponytail / CodeRabbit).
- Sugerencias de review que rechazaste, con el motivo.
- El SHA pusheado.
