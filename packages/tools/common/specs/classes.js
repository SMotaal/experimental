import {globals, FAIL, PASS, importFrom, runTests} from './helpers.js';

// import {Resource} from '../core/resource.js';
// import {Headers} from '../core/headers.js';
// import {Request} from '../core/request.js';
// import {Response} from '../core/response.js';

/** @typedef {import('../core')} classes */

const defaults = {};

/** @typedef {Partial<typeof defaults & typeof globals & classes>} locals */

const suites = {
	Resource: [
		Object.assign(
			/** @param {locals} locals */
			async ({Resource, source = import.meta.url}) => Resource.loadText(source),
			{collapsed: true},
		),
	],
	Headers: [
		({Headers}, variables) => (variables.headers = new Headers()),
		({Headers}, variables) => (variables.headers = new Headers({AbCd: 1})),
		({Headers, variables: {headers}}, variables) => (variables.headers = new Headers([...headers])),
	],
	Request: [
		({Request}, variables) => (variables.request = new Request()),
		({Request}, variables) => (variables.request = new Request('file.ext')),
		({Request}, variables) => (variables.request = new Request(new URL('file:///file.ext'))),
		({Request, variables: {request}}, variables) => (variables.request = new Request(request)),
	],
	Response: [
		({Response}, variables) => (variables.response = new Response()),
		({Response}, variables) => (variables.response = new Response('file.ext')),
		({Response}, variables) => (variables.response = new Response(new URL('file:///file.ext'))),
		({Response, variables: {response}}, variables) => (variables.response = new Response(response)),
		({Response, variables: {request}}, variables) => (variables.response = new Response(request)),
	],
};

export default /** @param {locals} locals */ async (locals = {}) => {
	try {
		const results = {};

		const {
			Resource = (locals.Resource = await importFrom('Resource', 'common/core/resource.js')),
			Request = (locals.Request = await importFrom('Request', 'common/core/request.js')),
			Response = (locals.Response = await importFrom('Response', 'common/core/response.js')),
			Headers = (locals.Headers = await importFrom('Headers', 'common/core/Headers.js')),
		} = locals;

		const classes = {Resource, Headers, Request, Response};

		for (const name in classes) {
			!suites[name] || (results[name] = {results: await runTests({locals, tests: suites[name]}), collapsed: true});
		}

		return {[import.meta.url]: {results, collapsed: false}};
	} catch (error) {
		return {[import.meta.url]: {error}};
	}
};
