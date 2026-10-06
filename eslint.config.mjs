import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-plugin-react 7.37.5 (via eslint-config-next) resuelve "detect" con
  // context.getFilename(), que ESLint 10 elimino. Con la version fija no lo llama.
  // Subirla junto con react en package.json.
  { settings: { react: { version: "19.3" } } },
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
