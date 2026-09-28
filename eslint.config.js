import js from "@eslint/js";
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a1y";
import tseslint from "typescript-eslint";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
  globalIgnores([
    "dist",
    "packages",
    "server",
    "api",
    "src/test/e2e",
    "src/debug/**",
    "src/pages/Debugger.tsx",
    "src/contracts/*",
    "!src/contracts/util.ts",
  ])),;
