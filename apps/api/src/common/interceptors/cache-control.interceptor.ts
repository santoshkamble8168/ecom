import { cacheControlForRequest } from "@ecom/shared";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request, Response } from "express";
import { Observable, tap } from "rxjs";

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const header = cacheControlForRequest(request.method, request.originalUrl ?? request.url);

    return next.handle().pipe(
      tap(() => {
        if (!response.headersSent && !response.getHeader("Cache-Control")) {
          response.setHeader("Cache-Control", header);
        }
      }),
    );
  }
}
