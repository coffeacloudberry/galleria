/** @type {import('stylelint').Config} */
export default {
    extends: ["stylelint-config-standard-scss"],
    rules: {
        // avoid specificity anti-patterns
        "declaration-no-important": true,
        "selector-max-id": 0,
        "selector-class-pattern": null,
    },
};
