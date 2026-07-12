/** ESLint config for Next.js apps (storefront, admin). */
module.exports = {
  root: false,
  extends: ["./index.js", "next/core-web-vitals"],
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
