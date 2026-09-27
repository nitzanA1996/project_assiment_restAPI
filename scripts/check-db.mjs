import mongoose from 'mongoose';

let server;
try {
  const { env } = await import('../dist/config/env.js');
  const { startServer } = await import('../dist/server.js');
  server = await startServer({ ...env, PORT: 0 });
  await mongoose.connection.db.command({ ping: 1 });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/ready`);
  if (response.status !== 200) throw new Error('Readiness check failed.');
  console.info('Database ping and HTTP readiness check passed. No application data was written.');
} catch (error) {
  const message = error instanceof Error ? error.message : '';
  console.error(message.startsWith('MongoDB connection failed.') || message.startsWith('Invalid environment configuration:')
    ? message : 'Connection check failed. Verify database availability and access settings.');
  process.exitCode = 1;
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
}
