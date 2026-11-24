import { Router } from 'express';

/** @deprecated Mantido apenas por compatibilidade; use os módulos NestJS. */
export class ApiRouter {
  private readonly router = Router();

  public getRouter(): Router {
    return this.router;
  }
}

