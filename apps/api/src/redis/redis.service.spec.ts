import { RedisService } from "./redis.service";

describe("RedisService.isHealthy", () => {
  function createService(pingResult: () => Promise<string>): RedisService {
    const service = Object.create(RedisService.prototype) as RedisService;
    (service as unknown as { ping: () => Promise<string> }).ping = pingResult;
    return service;
  }

  it("returns true when the server replies PONG", async () => {
    const service = createService(() => Promise.resolve("PONG"));
    await expect(service.isHealthy()).resolves.toBe(true);
  });

  it("returns false when the server replies with anything else", async () => {
    const service = createService(() => Promise.resolve("UNEXPECTED"));
    await expect(service.isHealthy()).resolves.toBe(false);
  });

  it("returns false when the ping call throws", async () => {
    const service = createService(() => Promise.reject(new Error("connection lost")));
    await expect(service.isHealthy()).resolves.toBe(false);
  });
});
