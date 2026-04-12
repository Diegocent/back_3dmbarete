/**
 * Punto de entrada del servidor.
 * Levanta la app en el puerto configurado y captura rechazos de promesas no manejados.
 */
import app from './app';
import { env } from './config/env';
import logger from './config/logger';

const PORT = env.port;
/** En Docker / PaaS hay que enlazar todas las interfaces (p. ej. DigitalOcean). */
const HOST = process.env.LISTEN_HOST ?? "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  logger.info(`Server running on http://${HOST}:${PORT}`);
  logger.info(`Raíz de la API: http://${HOST}:${PORT}/`);
});

process.on('unhandledRejection', (err: any) => {
  logger.error('UNHANDLED REJECTION! Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
