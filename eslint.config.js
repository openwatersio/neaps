import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  { ignores: ["dist/", "node_modules/", "packages/*/dist"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { files: ["**/*.ts"], languageOptions: { parser: tseslint.parser } },
  {
    files: ["packages/api/**/*.{js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
