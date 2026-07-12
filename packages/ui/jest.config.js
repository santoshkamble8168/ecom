/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts", "tsx"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.tsx?$",
  transform: {
    "^.+\\.(t|j)sx?$": ["ts-jest", { tsconfig: "<rootDir>/../tsconfig.json" }],
  },
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  collectCoverageFrom: ["**/*.(t|j)sx?"],
  coverageDirectory: "../coverage",
};
