import {CommonGlobals} from '../global';

export interface RequestConstructor {
	prototype: Request;
	new (input: RequestInfo, init?: RequestInit): Request;
}

export interface ResponseConstructor {
	prototype: Response;
	new (body?: BodyInit | null, init?: ResponseInit): Response;
	error(): Response;
	redirect(url: string, status?: number): Response;
}

export interface HeadersConstructor {
	prototype: Headers;
	new (init?: HeadersInit): Headers;
}

declare global {
	interface Globals {
		Request: RequestConstructor;
		Response: ResponseConstructor;
		Headers: HeadersConstructor;
	}
}

export const enum ResponseType {
	default = 'default',
	/**
	 * For a same origin request (without "Set-Cookie" and "Set-Cookie2" headers)
	 */
	basic = 'basic',
	/**
	 * For a cross-origin request (limited headers)
	 */
	cors = 'cors',
	/**
	 * For a Response.error() (status 0 without headers)
	 */
	error = 'error',
	/**
	 * For a no-cross-origin request to cross-origin resource (restricted)
	 */
	opaque = 'opaque',
	/**
	 * For a manual-redirect request (status 0 without headers, body or trailer)
	 */
	opaqueredirect = 'opaqueredirect',
}

export namespace types {
	export type Headers = CommonGlobals['Headers']['prototype'];
	export type Request = CommonGlobals['Request']['prototype'];
	export type Response = CommonGlobals['Response']['prototype'];
}
