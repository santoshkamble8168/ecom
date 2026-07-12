/** ESLint config for NestJS apps (api, worker). */
module.exports = {
  root: false,
  extends: ["./index.js"],
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
  },
};
