"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiRouter = void 0;
const express_1 = require("express");
/** @deprecated Mantido apenas por compatibilidade; use os módulos NestJS. */
class ApiRouter {
    router = (0, express_1.Router)();
    getRouter() {
        return this.router;
    }
}
exports.ApiRouter = ApiRouter;
