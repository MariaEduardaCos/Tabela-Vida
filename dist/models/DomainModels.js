"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiException = void 0;
class ApiException extends Error {
    statusCode;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.name = 'ApiException';
        this.statusCode = statusCode;
        this.details = details;
        Object.setPrototypeOf(this, ApiException.prototype);
    }
}
exports.ApiException = ApiException;
