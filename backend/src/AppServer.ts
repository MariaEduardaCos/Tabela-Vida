import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import { DatabaseConnection } from './config/DatabaseConnection';
import { ErrorHandlerMiddleware } from './middlewares/ErrorHandlerMiddleware';
import { ApiRouter } from './routes/ApiRouter';

export class AppServer {
  private readonly app: Application;
  private readonly port: number;
  private readonly db: DatabaseConnection;

  constructor(port: number = Number(process.env.PORT || 3000)) {
    this.app = express();
    this.port = port;
    this.db = DatabaseConnection.getInstance();

    this.configureMiddlewares();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddlewares(): void {
    this.app.use(
      cors({
        origin: ['http://localhost:4200', 'http://127.0.0.1:4200', '*'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })
    );
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logger HTTP conciso
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      console.log(`[HTTP] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
      next();
    });
  }

  private configureRoutes(): void {
    const apiRouter = new ApiRouter();
    this.app.use('/api', apiRouter.getRouter());
  }

  private configureErrorHandling(): void {
    this.app.use(ErrorHandlerMiddleware.notFoundHandler);
    this.app.use(ErrorHandlerMiddleware.handle);
  }

  public async start(): Promise<void> {
    await this.db.ensureDatabaseAndSchema();
    this.app.listen(this.port, () => {
      console.log(
        `=================================================================================`
      );
      console.log(
        `[AppServer] Servidor REST Tabela de Vida Ecológica (UniRV) ativo na porta ${this.port}`
      );
      console.log(`[AppServer] API Base URL: http://localhost:${this.port}/api`);
      console.log(
        `=================================================================================`
      );
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

