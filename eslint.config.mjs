import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "**/.next/",
      "**/node_modules/",
      "src/components/emsdk/**",
      "src/components/whisper.cpp/**",
      "public/transcriber/**",
      "public/workers/**",
      "public/models/**",
      "**/*.worker.js",
      "**/*.min.js",
      "**/*.wasm",
      "**/*.bin"
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
