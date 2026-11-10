export interface FoundationEnvironment {
  host: '127.0.0.1' | '::1';
  port: number;
  mode: 'development' | 'test';
}
export function readEnvironment(source: NodeJS.ProcessEnv = process.env): FoundationEnvironment {
  const host = source['G1_HOST'] ?? '127.0.0.1';
  const portText = source['G1_BACKEND_PORT'] ?? '3001';
  const mode = source['NODE_ENV'] ?? 'development';
  if (host !== '127.0.0.1' && host !== '::1')
    throw new Error('G1_HOST must be a loopback address.');
  if (!/^[0-9]+$/.test(portText)) throw new Error('G1_BACKEND_PORT must be a valid TCP port.');
  const port = Number(portText);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535)
    throw new Error('G1_BACKEND_PORT must be a valid TCP port.');
  if (mode !== 'development' && mode !== 'test')
    throw new Error(
      'G1 supports only explicit development/test operation; production is not configured.',
    );
  return { host, port, mode };
}
