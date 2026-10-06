import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactPkg from "react/package.json" with { type: "json" };

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-plugin-react 7.37 detecta la version de React con context.getFilename(),
  // que ESLint 10 elimino. Pasarla explicita evita el "detect" que revienta el lint.
  { settings: { react: { version: reactPkg.version } } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Reporte de cobertura: HTML y JS generados por jest, no codigo del repo.
    "coverage/**",
  ]),
]);

export default eslintConfig;
