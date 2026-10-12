import { env } from 'cloudflare:workers';
import { handleRequest } from '../../../lib/service.mjs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => handleRequest(request, env);
export const POST = GET;
export const PATCH = GET;
