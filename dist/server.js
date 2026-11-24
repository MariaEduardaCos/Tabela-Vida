"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AppServer_1 = require("./AppServer");
const server = new AppServer_1.AppServer(Number(process.env.PORT || 3000));
server.start().catch((error) => {
    console.error('[server.ts] Falha crítica ao inicializar o AppServer:', error);
    process.exit(1);
});
