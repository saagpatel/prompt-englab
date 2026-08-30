import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Existing flows intentionally sync state in effects for now.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["tools/long-goal-prompt-fuzzer/**/*.js", "tools/long-goal-prompt-fuzzer/**/*.cjs"],
    rules: {
      // The standalone Node 20 CLI is intentionally dependency-free CommonJS.
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
]);

export default eslintConfig;
