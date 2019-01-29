/// <reference path="../global.d.ts" />

import {Global} from '../common/global';

export interface WindowGlobals extends Global<Window> {}
export interface WorkerGlobals extends Global<Worker> {}
export interface ServiceWorkerGlobals extends Global<ServiceWorker> {}
export interface BrowserGlobals extends Global<Window & Worker & ServiceWorker> {}

declare global {
	interface Globals {
		self: BrowserGlobals;
		window: WindowGlobals;
	}
}
