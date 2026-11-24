"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlerMiddleware = void 0;
const DomainModels_1 = require("../models/DomainModels");
class ErrorHandlerMiddleware {
    static notFoundHandler = (req, res, _next) => {
        res.status(404).json({
            status: 404,
            erro: `Endpoint REST não encontrado: ${req.method} ${req.originalUrl}`,
            timestamp: new Date().toISOString(),
        });
    };
    static handle = (err, _req, res, _next) => {
        if (err instanceof DomainModels_1.ApiException) {
            res.status(err.statusCode).json({
                status: err.statusCode,
                erro: err.message,
                detalhes: err.details,
                timestamp: new Date().toISOString(),
            });
            return;
        }
        const message = err instanceof Error ? err.message : 'Erro interno inesperado no servidor.';
        console.error('[ErrorHandlerMiddleware]', err);
        res.status(500).json({
            status: 500,
            erro: message,
            timestamp: new Date().toISOString(),
        });
    };
}
exports.ErrorHandlerMiddleware = ErrorHandlerMiddleware;
