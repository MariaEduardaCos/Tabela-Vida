import { AppServer } from './AppServer';

const server = new AppServer(Number(process.env.PORT || 3000));

server.start().catch((error) => {
  console.error('[server.ts] Falha crítica ao inicializar o AppServer:', error);
  process.exit(1);
});

