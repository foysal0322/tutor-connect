import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Prevent debug logging from shipping to production.
    // console.error and console.warn are still allowed — those are legitimate
    // signal in client code. Stripping them entirely hides real problems.
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-explicit-any": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Enforce the rules-of-hooks and exhaustive-deps invariants so a missing
    // React import (like the FindTutorClient bug from FRONTEND_AUDIT.md B1)
    // fails CI rather than the user.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
