import {dynamicImport} from '/pholio/lib/import.js';

const options = {
	hashed: true,
	redirects: {},
};

const EntryParts = /^(.*)(\/(?:([^\/.][^\/]*?)(?:(\.\w+)|))?)$/;
const EntryTail = /\/(?:[^./]+(?:\.(?:.*\.|)(?:md|markdown)|)|)$/i;

const {log, warn, group, groupCollapsed, groupEnd} = console;

// Only bootstrap preview if in valid browser window scope
typeof document !== 'object' ||
	!document ||
	typeof location !== 'object' ||
	typeof location.hash !== 'string' ||
	requestAnimationFrame(async () => {
		// Pickup declarative link "from head" if present
		const link = document.head.querySelector(
			'link[rel="alternate" i][type^="text/markout" i][type^="text/markdown" i][type^="text/md" i][href], link[rel="alternate" i][href$=".md" i][href$=".markdown" i], link[rel="alternate" i][href]',
		);

		// Pickup or create markdown-section in the body
		const section = document.body.querySelector('markout-content') || document.create('markout-content');

		// TODO: https://developers.google.com/web/updates/2015/09/history-api-scroll-restoration

		bootstrap: {
			section.isConnected || document.body.appendChild(section);
			const markoutBase = new URL('/markout/', import.meta.url);
			const root = new URL('/', import.meta.url);
			const scope = new URL('/experimental/', import.meta.url).pathname;

			const state = (history.state && history.state) || {};

			// Only promote to preview shell if src is not present
			if (!section.hasAttribute('src')) {
				// State
				const README = `${markoutBase}README.md`;
				const {
					title: TITLE = (state.title = document.title = options.title || document.title || location.hostname),
					hashes = (state.hashes = {}),
					resolutions = (state.resolutions = {}),
					redirects = (state.redirects = {}),
				} = state;

				location.hash.length > 1 ||
					!location.href.startsWith(root.href) ||
					!EntryTail.test(location.pathname.slice(root.pathname.length - 1)) ||
					history.replaceState(state, TITLE, `${scope}${location.search}#${location.pathname}`);

				const resolve = specifier => {
					if (!specifier) return specifier;
					const records = Object.values(options.redirects);
					// if (specifier in resolutions) return resolutions[specifier];
					const [, head, tail, entry = 'README', extension = '.md'] =
						// EntryParts.exec(redirect(specifier, records)) || '';
						EntryParts.exec(specifier) || '';
					return redirect((resolutions[specifier] = tail ? `${head}\/${entry}${extension}` : specifier), records);
					// return (resolutions[specifier] = tail ? `${head}\/${entry}${extension}` : redirect(specifier, records));
					// return (resolutions[specifier] = redirect(tail ? `${head}\/${entry}${extension}` : specifier));
				};

				function redirect(specifier, records = Object.values(options.redirects)) {
					let redirected = specifier;
					// if (specifier in redirects) return redirects[specifier];
					let target, matched, matching, matches, scope, pathname;
					try {
						if (!options.redirects || !specifier) return redirected;
						pathname = specifier.startsWith('/')
							? specifier
							: specifier.startsWith(root.href)
							? specifier.slice(root.href.length - 1)
							: specifier.startsWith('./')
							? `${scope}${specifier.slice(2)}`
							: null;
						if (pathname === null) return redirected;
						scope = pathname.endsWith('/') ? pathname : pathname.replace(EntryTail, '/');
						matches = [];
						matched = '';
						for (const record of records) {
							const {target} = (matching = {...record});
							target &&
								((matching.exactMatch = pathname === target) ||
									(target.endsWith('/') &&
										((matching.directMatch = pathname === target.slice(0, -1)) ||
											(matching.scopedMatch =
												(matching.length = target.length) &&
												(matching.delta = (matched.length || 0) - target.length) < 0 &&
												pathname.startsWith(target))))) &&
								matches.push((matched = matching));

							if (matching.exactMatch || matching.directMatch) break;
						}

						if ((target = matched && matched.target)) {
							redirected = `${root.pathname.slice(0, -1) || ''}${
								target === pathname ? matched.pathname : `${matched.pathname}${pathname.slice(target.length)}`
							}`;
						}

						return redirected;
					} finally {
						// const changed = redirected !== specifier;
						redirects[specifier] === redirected || (redirects[specifier] = redirected);
						log(
							`redirect(${Array(arguments.length)
								.fill('%O')
								.join(',')}) => %O %o`,
							...arguments,
							redirected,
							{target, matched, matching, matches, scope, pathname},
						);
					}
				}

				async function load(source, title) {
					let previous = `${location}`;

					// Pickup current fragment when source is hashchanged event
					if (source && source.type === 'hashchange') {
						if ((previous = source.oldURL) === source.newURL) return;
						source = location;
					}

					let href, hash, referrer, loaded, hashed;
					let address = `${location}`;
					let src = source;

					((hash = location.hash.trim()) &&
						// We're using location fragment
						((!source && (source = location)) || source === location) &&
						((referrer = `${location}`), (href = hash.slice(1)), (src = `${new URL(href, referrer)}`))) ||
						// We're using an alternate link
						(link &&
							(href = link.href) &&
							(!source || source === link) &&
							(source = link) &&
							(title || (title = link.getAttribute(title)), (src = `${new URL(href, (referrer = `${location}`))}`))) ||
						// We're using the literal source or defaulting to README
						(src = `${new URL(
							(href = `${source || ''}`.trim() || (source = section).getAttribute('src') || (source = README)),
							(referrer = section.sourceURL || `${location}`),
						)}`);

					title || (title = undefined);

					if (source === location && hash && hash.length > 1) {
						if (href !== (href = resolve(href))) {
							if (options.hashed) {
								referrer = `${location}`.replace(hash, (hash = `#${href}`));
								src = `${new URL(href, referrer)}`;
							} else {
								src = referrer = `${new URL(href, root)}`;
							}
							address = referrer;
						}
					}

					address = address.replace(/(?:README|).(?:md)(?=[?#]|$)/, '');

					hash || (hash = '#');
					hashed = hashes[hash] = {referrer, href, src, title};
					// hashes[hash] && hashes[hash].href === redirect(hashes[hash].href)
					// 	? ({referrer, href, src, title = TITLE} = hashes[hash])
					// 	: (hashed = hashes[hash] = {referrer, href, src, title});

					// log({hash, referrer, href, src}, state);

					if (href === section.sourceURL) return;

					try {
						if (section.load) {
							await section.load(href);
							loaded = `${section.sourceURL}`;
						} else {
							loaded = false;
							section.setAttribute('src', href);
						}
						history.replaceState(state, title || TITLE, address);
					} catch (exception) {
						loaded = undefined;
						warn(exception);
						if (previous) {
							history.back();
							// location = previous;
							// history.replaceState(state, title || TITLE, previous);
						}
					}

					log(
						`load(${Array(arguments.length)
							.fill('%O')
							.join(',')}) => %o`,
						...arguments,
						{loaded, previous, ...hashed},
					);
				}

				section.baseURL || (section.baseURL = location.href.replace(/[?#].*$|$/, ''));

				load();

				addEventListener('hashchange', load, {passive: false, capture: true});

				// Only bootstrap markout-content if not already bootstrapped
				if (typeof section.load !== 'function' || !section.matches(':defined')) {
					const url = new URL(import.meta.url);
					location.search.length > 1 && (url.search += `${url.search ? '&' : '?'}${location.search.slice(1)}`);
					url.search && (url.search = `?${[...new Set(url.search.slice(1).split('&'))].sort().join('&')}`);
					const DEV = /[?&]dev\b/.test(url.search);
					const LIB = `${markoutBase}${DEV ? 'lib/browser.js' : 'dist/browser.m.js'}${url.search}`;
					await dynamicImport(new URL(LIB, markoutBase));
					// import(new URL(LIB, markoutBase));
				}

				// load();
			}
		}
	});

/**
 * @param {Partial<typeof options>} configuration
 */
export function setup(configuration, referrer = import.meta.url) {
	if (!configuration || typeof configuration !== 'object') return;
	// const redirects = {};
	const warnings = [];
	const traces = [];

	let {redirects} = configuration;

	if (redirects) {
		const enumerable = true;
		const writable = false;
		const descriptors = {};
		const values = {};

		const currentRedirects = options.redirects || (options.redirects = {});

		for (const key of Object.getOwnPropertyNames(redirects)) {
			let url, pathname, info;

			const value = redirects[key];

			info = `[ ${key} => ${value} ]`;

			// const directory = target.endsWith('/');
			if (!key.startsWith('./')) {
				!(key && key.trim()) || warnings.push(`Ignoring redirect ${info} — supported keys must always start with "./"`);
				continue;
			}

			if (!value || !/^[.]{0,2}[/]/.test(value)) {
				warnings.push(`Ignoring redirect ${info} — supported values must be strings and start with "./", "../" or "/"`);
				continue;
			}

			const target = new URL(key, referrer).pathname || '';

			info += ` from "${target}"`;

			const destination = `${value || ''}`.trim();
			// .replace(/\/?$/,target.endsWith('/') ? '/' : '$1');

			if (destination) {
				try {
					({href: url, pathname: pathname} = new URL(destination, referrer));
					info += ` to "${pathname}"`;
				} catch (exception) {
					warnings.push(
						`Ignoring redirect ${info} — could not resolve the destination "${destination}" relative to "${referrer}"`,
					);
					continue;
				}
			}

			if (target in currentRedirects) {
				const currentRedirect = currentRedirects[target];
				url === currentRedirect.url ||
					pathname === currentRedirect.pathname ||
					warnings.push(`Ignoring redirect ${info} — already redirected to "${currentRedirect.pathname}"`);
				continue;
			}

			descriptors[target] = {value: (values[target] = {target, destination, pathname, url}), enumerable, writable};

			// target.endsWith('/') && (descriptors[target.slice(0, -1)] = descriptors[target]);
			// ({
			// 	value: (values[target.slice(0, -1)] = {
			// 		target: target.slice(0, -1),
			// 		destination: destination.endsWith('/') ? destination.slice(0, -1) : destination,
			// 		pathname: pathname.endsWith('/') ? pathname.slice(0, -1) : pathname,
			// 		url: url.endsWith('/') ? url.slice(0, -1) : url,
			// 	}),
			// 	enumerable,
			// 	writable,
			// });
		}

		Object.defineProperties(currentRedirects, descriptors);

		traces.push(() => {
			group('redirects');
			log(values);
			warnings.length && (warnings.redirects = warnings.splice(0, warnings.length)).map(warning => warn(warning));
			groupEnd();
		});
	}

	if (traces.length) {
		group(`setup(${'%O'.repeat(arguments.length)})`, ...arguments);
		for (const trace of traces) trace();
		groupEnd();
	}
}

// const redirects = (({
// 	script,
// 	redirects = (history.state && history.state.redirects) || {
// 		...(1,
// 		eval(`({${(script && (/^[\s\n]*\(\{([^]*)\}\)[\s\n]*$|()/i.exec(script.textContent) || '')[1]) || ''}})`)),
// 	},
// } = {}) => redirects)({script});

// const parseRedirects = source => {
// 	let code, json, redirects;
// 	const body =
// 		(source && (/^[\s\n]*\([\s\n]*\{[\s\n]*([^]*)[\s\n]*\}[\s\n]*\)[\s\n]*$/i.exec(source) || '')[1]) || '';
// 	if (
// 		(body &&
// 			(/(?:=>|[:;]|[/](?:[/]+|[*][^]*?[*][/]))(?=[^"]*$)/m.test(body)
// 				? (code = `({${body}})`)
// 				: (json = `{${body.trim().replace(/(?:\s*\n+\s*)*\n|,$/g, '\n')}}`))) ||
// 		void log({source, body})
// 	) {
// 		try {
// 			redirects = code ? (1, eval)(code) : JSON.parse(json);
// 			log({source, code, json, redirects});
// 		} catch (exception) {
// 			warn(exception, {source, code, json, redirects});
// 		}
// 	}

// 	return redirects || {};
// };

// // const {hashes = (history.state.hashes = {}), redirects = parseRedirects(script && script.textContent)} = state;

// const script = document.querySelector(`script[type="module" i][src$="${import.meta.url.replace(root, '/')}" i]`);
