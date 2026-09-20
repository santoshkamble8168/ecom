import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "../../..");
const SECRET_PUBLIC_KEY = /^NEXT_PUBLIC_.*(SECRET|PASSWORD|PRIVATE|TOKEN|KEY_SECRET)/i;

function publicKeys(file: string): string[] {
  const contents = readFileSync(join(ROOT, file), "utf8");
  return contents
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.split("=")[0] ?? "")
    .filter((key) => key.startsWith("NEXT_PUBLIC_"));
}

describe("browser-exposed env examples", () => {
  it.each(["apps/storefront/.env.example", "apps/admin/.env.example"])(
    "does not prefix secrets with NEXT_PUBLIC_ in %s",
    (file) => {
      const keys = publicKeys(file);
      const leaked = keys.filter((key) => SECRET_PUBLIC_KEY.test(key));
      expect(leaked).toEqual([]);
    },
  );
});
