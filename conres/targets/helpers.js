export {loadSourceTextFrom} from '/components/lib/fetch.js';
// export {sequence, matchAll} from '/markout/lib/helpers.js';
export {LineBreaks, Tabs} from './lib/normalizer.js';
export {default as dynamicImport} from '/browser/dynamicImport.js';
export {Segmenter} from '/modules/segmenter/segmenter.js';
export {Matcher, INSET, OUTSET, LOOKAHEAD, UNKNOWN, matchAll} from '/modules/matcher/matcher.js';
export {debugMatcher} from '/modules/matcher/matcher.debug.js';

export const createDataURL = (body, {type, encode = btoa, encoding, ...attributes} = {}) =>
	`data:${[
		`${type || ''}`.trim() || 'text/plain',
		Object.entries(attributes)
			.map(
				([k, v]) =>
					typeof v !== 'symbol' &&
					(v || (v !== undefined && v !== '' && v !== null)) &&
					typeof k === 'string' &&
					encodeURIComponent(k) === (k = k.trim()) &&
					(v = /^"([^]*)"$/[Symbol.replace](JSON.stringify(v), '$1').trim()) &&
					`${k}=${encodeURIComponent(v)}`,
			)
			.filter(Boolean)
			.join('&'),
		(encoding ||
			(typeof encode === 'function' &&
				(encoding = (encode === btoa && 'base64') || `${(encode && encode.name) || ''}`))) &&
			typeof encoding === 'string' &&
			encoding === encodeURIComponent(encoding.trim()) &&
			encoding,
	]
		.filter(Boolean)
		.join(';')},${
		encode === btoa ? encode(unescape(encodeURIComponent(body))) : typeof encode === 'function' ? encode(body) : body
	}`;

export const createBlobURL = (body, {type}) =>
	URL.createObjectURL(new Blob([body], {type: `${type || ''}`.trim() || 'text/plain'}));

// const concatenate = Function.call.bind(
// 	class extends Array {
// 		join(joiner) {
// 			return this.filter(Boolean).join(joiner);
// 		}
// 	}.prototype.join,
// );
