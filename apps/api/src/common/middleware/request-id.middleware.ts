import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuid } from "uuid";

export const REQUEST_ID_HEADER = "x-request-id";

declare module "express" {
  interface Request {
    requestId: string;
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header(REQUEST_ID_HEADER);
    const requestId = incoming && incoming.length > 0 ? incoming : uuid();
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
