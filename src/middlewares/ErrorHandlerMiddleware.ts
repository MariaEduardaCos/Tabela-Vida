import { NextFunction, Request, Response } from 'express';
import { ApiException } from '../models/DomainModels';

export class ErrorHandlerMiddleware {
  public static notFoundHandler = (
    req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    res.status(404).json({
      status: 404,
      erro: `Endpoint REST não encontrado: ${req.method} ${req.originalUrl}`,
      timestamp: new Date().toISOString(),
    });
  };

  public static handle = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    if (err instanceof ApiException) {
      res.status(err.statusCode).json({
        status: err.statusCode,
        erro: err.message,
        detalhes: err.details,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const message =
      err instanceof Error ? err.message : 'Erro interno inesperado no servidor.';
    console.error('[ErrorHandlerMiddleware]', err);

    res.status(500).json({
      status: 500,
      erro: message,
      timestamp: new Date().toISOString(),
    });
  };
}

