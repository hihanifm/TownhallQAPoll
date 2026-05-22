import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const portsConfigPath = resolve(process.cwd(), 'config/ports.json');
const portsConfig = JSON.parse(readFileSync(portsConfigPath, 'utf8'));
const devPorts = portsConfig.dev || {};

export const FRONTEND_PORT = Number(process.env.FRONTEND_PORT) || Number(devPorts.frontend) || Number(portsConfig.frontend);
export const BACKEND_PORT = Number(process.env.PORT) || Number(process.env.BACKEND_PORT) || Number(devPorts.backend) || Number(portsConfig.backend);

export const FRONTEND_BASE_URL = process.env.FRONTEND_URL || `http://localhost:${FRONTEND_PORT}`;
export const BACKEND_BASE_URL = process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;
export const API_BASE_URL = process.env.API_BASE_URL || `${BACKEND_BASE_URL}/api`;
