import { env } from 'cloudflare:workers';
import { handleRequest } from '../../../lib/service.mjs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => handleRequest(request, env);
