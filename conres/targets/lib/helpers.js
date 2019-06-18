/// Strings

export const indentLines = (text, indent = '  ') => /^/gm[Symbol.replace](text, indent);

/// URLs

export const createDataURL = (body, {type, encode = btoa, encoding, ...attributes} = {}) =>
	`data:${[
		`${type || ''}`.trim() || 'text/plain',
		Object.entries(attributes)
			.map(
				([k, v]) =>
					'symbol' !== typeof v &&
					(v || (v !== undefined && v !== '' && v !== null)) &&
					'string' === typeof k &&
					encodeURIComponent(k) === (k = k.trim()) &&
					(v = /^"([^]*)"$/[Symbol.replace](JSON.stringify(v), '$1').trim()) &&
					`${k}=${encodeURIComponent(v)}`,
			)
			.filter(Boolean)
			.join('&'),
		(encoding ||
			('function' === typeof encode &&
				(encoding = (encode === btoa && 'base64') || `${(encode && encode.name) || ''}`))) &&
			'string' === typeof encoding &&
			encoding === encodeURIComponent(encoding.trim()) &&
			encoding,
	]
		.filter(Boolean)
		.join(';')},${
		encode === btoa ? encode(unescape(encodeURIComponent(body))) : 'function' === typeof encode ? encode(body) : body
	}`;

export const createBlobURL = (body, {type}) =>
	URL.createObjectURL(new Blob([body], {type: `${type || ''}`.trim() || 'text/plain'}));
