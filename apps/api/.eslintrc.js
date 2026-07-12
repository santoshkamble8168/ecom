module.exports = {
  root: true,
  extends: ["@ecom/eslint-config/nestjs.js"],
  parserOptions: {
    project: "./tsconfig.json",
  },
  ignorePatterns: ["prisma", "dist", "node_modules"],
};
