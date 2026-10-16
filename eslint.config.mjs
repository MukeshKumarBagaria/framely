import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// The business-analysis ERP is a self-contained module. These two rules keep
// it from depending on the template studio, and the studio from depending on
// it, so either side can change (or be removed) without touching the other.
// src/proxy.ts only routes /business-analysis pages, so it belongs to the module.
const businessAnalysisFiles = [
  "src/proxy.ts",
  "src/business-analysis/**",
  "src/app/business-analysis/**",
  "src/app/api/business-analysis/**",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: businessAnalysisFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/*", "@/lib/*", "@/data/*", "@/app/(studio)/*"],
              message: "business-analysis must not import from the template studio.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**"],
    ignores: businessAnalysisFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/business-analysis", "@/business-analysis/*"],
              message: "Template studio code must not import from business-analysis.",
            },
          ],
        },
      ],
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
