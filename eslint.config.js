import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Codebase legado usa `any` em telemetria/integrações; mantemos como aviso
      // para não mascarar erros reais de lint.
      "@typescript-eslint/no-explicit-any": "warn",
      // `catch {}` é intencional em telemetria (não pode quebrar UX).
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Regras estilísticas que geram muito ruído em parsers de texto jurídico,
      // configs e edge functions Deno — viram aviso, não erro.
      "no-useless-escape": "warn",
      "no-control-regex": "off",
      "no-irregular-whitespace": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-constant-condition": ["warn", { checkLoops: false }],
    },
  },
);
