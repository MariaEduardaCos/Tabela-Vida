import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiException } from '../models/DomainModels';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno inesperado no servidor.';
    let details: unknown;

    if (exception instanceof ApiException) {
      status = exception.statusCode;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      message = typeof payload === 'string' ? payload : (payload as any).message || exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      console.error('[GlobalExceptionFilter]', exception);
    }

    response.status(status).json({
      status,
      erro: message,
      detalhes: details,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    });
  }
}
