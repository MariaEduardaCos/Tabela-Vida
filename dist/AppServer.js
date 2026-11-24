"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppServer = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const DatabaseConnection_1 = require("./config/DatabaseConnection");
const ErrorHandlerMiddleware_1 = require("./middlewares/ErrorHandlerMiddleware");
const ApiRouter_1 = require("./routes/ApiRouter");
class AppServer {
    app;
    port;
    db;
    constructor(port = Number(process.env.PORT || 3000)) {
        this.app = (0, express_1.default)();
        this.port = port;
        this.db = DatabaseConnection_1.DatabaseConnection.getInstance();
        this.configureMiddlewares();
        this.configureRoutes();
        this.configureErrorHandling();
    }
    configureMiddlewares() {
        this.app.use((0, cors_1.default)({
            origin: ['http://localhost:4200', 'http://127.0.0.1:4200', '*'],
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }));
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ extended: true }));
        // Logger HTTP conciso
        this.app.use((req, _res, next) => {
            console.log(`[HTTP] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
            next();
        });
    }
    configureRoutes() {
        const apiRouter = new ApiRouter_1.ApiRouter();
        this.app.use('/api', apiRouter.getRouter());
    }
    configureErrorHandling() {
        this.app.use(ErrorHandlerMiddleware_1.ErrorHandlerMiddleware.notFoundHandler);
        this.app.use(ErrorHandlerMiddleware_1.ErrorHandlerMiddleware.handle);
    }
    async start() {
        await this.db.ensureDatabaseAndSchema();
        this.app.listen(this.port, () => {
            console.log(`=================================================================================`);
            console.log(`[AppServer] Servidor REST Tabela de Vida Ecológica (UniRV) ativo na porta ${this.port}`);
            console.log(`[AppServer] API Base URL: http://localhost:${this.port}/api`);
            console.log(`=================================================================================`);
        });
    }
    getApp() {
        return this.app;
    }
}
exports.AppServer = AppServer;
