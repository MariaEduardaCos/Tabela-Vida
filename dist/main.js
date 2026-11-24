"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const GlobalExceptionFilter_1 = require("./filters/GlobalExceptionFilter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new GlobalExceptionFilter_1.GlobalExceptionFilter());
    const port = Number(process.env.PORT || 3000);
    await app.listen(port);
    console.log(`[NestJS] API ativa em http://localhost:${port}/api`);
}
bootstrap().catch((error) => {
    console.error('[NestJS] Falha crítica ao inicializar:', error);
    process.exit(1);
});
