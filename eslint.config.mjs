import eslint from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import json from "eslint-plugin-json";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: [
            "public",
            "node_modules",
            "src/icons",
            "src/fonts",
            "src/style",
            "src/qr_codes",
            "tests/end_to_end",
            "**/*.html",
            "**/_*",
            "**/*.md",
            "**/.*",
            "cli",
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["**/*.ts"],

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2020,
            sourceType: "module",

            parserOptions: {
                project: "tsconfig.json",
            },
        },

        rules: {
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/ban-ts-comment": "error",
            "@typescript-eslint/restrict-template-expressions": "error",

            "@typescript-eslint/unbound-method": [
                "error",
                {
                    ignoreStatic: true,
                },
            ],

            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    varsIgnorePattern: "^turf$|^mapboxgl$|^Chart$",
                },
            ],

            "max-len": [
                "error",
                {
                    ignoreUrls: true,
                    ignoreStrings: true,
                    ignoreTrailingComments: true,
                    code: 80,
                },
            ],

            "no-nested-ternary": "error",
            "no-unneeded-ternary": "error",
            "no-throw-literal": "error",
            "object-shorthand": "error",
        },
    },
    {
        files: ["**/*.ts", "**/*.js"],

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                ...globals.mocha,
            },
        },

        rules: {
            "no-regex-spaces": "off",
        },
    },
    {
        files: ["**/*.json"],

        ...json.configs.recommended,
    },
];
