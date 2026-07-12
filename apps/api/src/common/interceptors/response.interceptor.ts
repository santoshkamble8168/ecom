import { buildSuccessResponse } from "@ecom/shared";
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { Observable, map } from "rxjs";

/**
 * Wraps every successful controller response in the standard
 * `{ success, data, requestId, timestamp }` envelope. Controllers stay
 * focused on returning plain data.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.requestId ?? "unknown";

    return next.handle().pipe(map((data) => buildSuccessResponse(data, requestId)));
  }
}
