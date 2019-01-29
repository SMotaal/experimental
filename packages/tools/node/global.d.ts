/// <reference path="../global.d.ts" />

import {Global} from '../common/global';

export interface NodeGlobals extends Global<NodeJS.Global> {}

declare global {
	interface Globals {
		global: NodeGlobals;
	}
}
