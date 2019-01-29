/// <reference path="../global.d.ts" />
/// <reference path="../browser/global.d.ts" />
/// <reference path="../node/global.d.ts" />

export interface CommonGlobals extends Global<Partial<WindowOrWorkerGlobalScope & ServiceWorker & NodeJS.Global>> {
	Object: ObjectConstructor;
}

export type globals = keyof Globals;

export type Global<T extends {}, K extends keyof T = keyof T> = T &
	{[k in K | globals]: k extends K ? T[k] : k extends globals ? Globals[k] : any};
