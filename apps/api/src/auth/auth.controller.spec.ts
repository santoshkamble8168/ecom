import { UnauthorizedError } from "@ecom/shared";
import { OtpChannel } from "@prisma/client";
import type { Request, Response } from "express";

import type { UsersService } from "../users/users.service";

import { AuthController } from "./auth.controller";
import type { AuthService, IssuedTokens } from "./auth.service";

const TOKENS: IssuedTokens = { accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 900 };

function makeRequest(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeResponse() {
  return { cookie: jest.fn(), clearCookie: jest.fn() };
}

describe("AuthController refresh-token cookie", () => {
  let authService: { verifyOtp: jest.Mock; refresh: jest.Mock; logout: jest.Mock };
  let controller: AuthController;

  beforeEach(() => {
    authService = {
      verifyOtp: jest.fn().mockResolvedValue(TOKENS),
      refresh: jest.fn().mockResolvedValue(TOKENS),
      logout: jest.fn().mockResolvedValue(undefined),
    };
    controller = new AuthController(authService as unknown as AuthService, {} as UsersService);
  });

  const verifyDto = { channel: OtpChannel.email, destination: "a@b.c", code: "123456" };

  it("sets an httpOnly cookie and omits the refresh token for browser clients", async () => {
    const response = makeResponse();
    const body = await controller.verifyOtp(
      verifyDto,
      makeRequest({ "x-ecom-client": "storefront" }),
      response as unknown as Response,
    );

    expect(body).toEqual({ accessToken: "access-1", expiresIn: 900 });
    expect(response.cookie).toHaveBeenCalledWith(
      "ecom_rt_storefront",
      "refresh-1",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/api/v1/auth" }),
    );
  });

  it("keeps the body token contract for clients without the header", async () => {
    const response = makeResponse();
    const body = await controller.verifyOtp(verifyDto, makeRequest(), response as unknown as Response);

    expect(body).toEqual(TOKENS);
    expect(response.cookie).not.toHaveBeenCalled();
  });

  it("refreshes from the client's own cookie and rotates it", async () => {
    const response = makeResponse();
    await controller.refresh(
      {},
      makeRequest({ "x-ecom-client": "admin", cookie: "ecom_rt_storefront=other; ecom_rt_admin=old-admin" }),
      response as unknown as Response,
    );

    expect(authService.refresh).toHaveBeenCalledWith("old-admin");
    expect(response.cookie).toHaveBeenCalledWith("ecom_rt_admin", "refresh-1", expect.any(Object));
  });

  it("rejects a refresh without any token", async () => {
    await expect(
      controller.refresh({}, makeRequest({ "x-ecom-client": "admin" }), makeResponse() as unknown as Response),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(authService.refresh).not.toHaveBeenCalled();
  });

  it("clears the cookie when the refresh token is rejected", async () => {
    authService.refresh.mockRejectedValue(new UnauthorizedError("Refresh token is invalid or has expired"));
    const response = makeResponse();

    await expect(
      controller.refresh(
        {},
        makeRequest({ "x-ecom-client": "storefront", cookie: "ecom_rt_storefront=revoked" }),
        response as unknown as Response,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(response.clearCookie).toHaveBeenCalledWith("ecom_rt_storefront", expect.any(Object));
  });

  it("revokes the cookie token and clears the cookie on logout", async () => {
    const response = makeResponse();
    await controller.logout(
      { id: "user-1" } as never,
      {},
      makeRequest({ "x-ecom-client": "storefront", cookie: "ecom_rt_storefront=live" }),
      response as unknown as Response,
    );

    expect(authService.logout).toHaveBeenCalledWith("live", "user-1");
    expect(response.clearCookie).toHaveBeenCalledWith("ecom_rt_storefront", expect.any(Object));
  });
});
