import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "spike", "art", "base44", ".agents", ".claude"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "@typescript-eslint/no-explicit-any": "error" },
  },
  {
    // The sim must stay DOM-free and deterministic.
    files: ["src/game/sim/**/*.ts"],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "no-restricted-globals": ["error", "window", "document", "navigator", "localStorage"],
      "no-restricted-properties": ["error", { object: "Math", property: "random", message: "Use the seeded RNG." }],
    },
  },
);
