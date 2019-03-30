import {dynamicImport} from '../pholio/lib/import.js';

// Only bootstrap preview if in valid browser window scope
if (typeof document === 'object' && document && typeof location === 'object' && 'hash' in location) {
	// Pickup declarative link "from head" if present
	const link = document.head.querySelector(
		'link[rel="alternate" i][type^="text/markout" i][type^="text/markdown" i][type^="text/md" i][href], link[rel="alternate" i][href$=".md" i][href$=".markdown" i], link[rel="alternate" i][href]',
	);

	// Pickup or create markdown-section in the body
	const section = document.body.querySelector('markout-content') || document.create('markout-content');

	// TODO: https://developers.google.com/web/updates/2015/09/history-api-scroll-restoration

	bootstrap: {
		section.isConnected || document.body.appendChild(section);
		// const base = new URL('/markout/', import.meta.url);
		const markoutBase = new URL('../markout/', import.meta.url);
		const root = new URL('../', import.meta.url);
		const scope = new URL('./', import.meta.url).pathname;
		const EntryParts = /^(.*)(\/(?:([^\/.][^\/]*?)(?:(\.\w+)|))?)$/;
		// const EntryParts = /^(.*)(\/(?:([^\/.][^\/]*?)(?:(\.\w+)|)$|(?=\/$)|$))/;
		const EntryTail = /\/(?:[^./]+(?:\.(?:.*\.|)(?:md|markdown)|)|)$/i;
		// const EntryTail = /\/(?:[^./]+(?:\.(?:.*\.|)(?:md|markdown)|)$|(?=\/$)|$)/i;

		// const {HASH_ONLY = (localStorage['HASH_ONLY'] = true)} = localStorage;
		console.log({...location});
		const HASH_ONLY = !!location.hash || /^[^?]+#/.test(location.href);
		//  !!location.hash; // || location.pathname !== scope;

		// Only promote to preview shell if src is not present
		if (!section.hasAttribute('src')) {
			// State
			const README = `${markoutBase}README.md`;
			const hashes = (history.state && history.state.hashes) || {};

			location.hash.length > 1 ||
				!location.href.startsWith(root.href) ||
				!EntryTail.test(location.pathname.slice(root.pathname.length - 1)) ||
				history.replaceState({hashes}, document.title, `${scope}${location.search}#${location.pathname}`);

			const resolve = specifier => {
				const [, head, tail, entry = 'README', extension = '.md'] = EntryParts.exec(specifier) || '';
				return tail ? `${head}\/${entry}${extension}` : specifier;
			};

			const load = async (source, title = document.title) => {
				// Pickup current fragment when source is hashchanged event
				if (source && 'type' in source && source.type === 'hashchange') {
					if (source.oldURL === source.newURL) return;
					// Responsibly responsive - nothing more :)
					await new Promise(requestAnimationFrame);
					source = location;
				}

				let href, hash, referrer;
				let src = source;

				((hash = location.hash.trim()) &&
					// We're using location fragment
					((!source && (source = location)) || source === location) &&
					(hashes[hash] ||
						((referrer = `${location}`), (href = hash.slice(1)), (src = `${new URL(href, referrer)}`)))) ||
					// We're using an alternate link
					(link &&
						(href = link.href) &&
						(!source || source === link) &&
						(source = link) &&
						(src = `${new URL(href, (referrer = `${location}`))}`)) ||
					// We're using the literal source or defaulting to README
					(src = `${new URL(
						(href = `${source || ''}`.trim() || (source = section).getAttribute('src') || (source = README)),
						(referrer = section.sourceURL || `${location}`),
					)}`);

				if (source === location && hash && hash.length > 1) {
					if (href !== (href = resolve(href))) {
						// if (/^true$/i.test(HASH_ONLY)) {
						if (HASH_ONLY) {
							referrer = `${location}`.replace(hash, (hash = `#${href}`));
							src = `${new URL(href, referrer)}`;
						} else {
							src = referrer = `${new URL(href.replace(/\.(md|markdown)$/i, ''), root)}`;
							// src = `${new URL(href, root)}`;
						}
						history.replaceState({hashes}, title, referrer);
					}
					// const [
					// 	,
					// 	head,
					// 	tail,
					// 	entry = 'README',
					// 	extension = '.md',
					// ] = /^#(.*)(\/(?:([^\/.][^\/]*?)(?:(\.\w+)|))?)$/.exec(hash);

					// if (tail) {
					// 	href = `${head}\/${entry}${extension}`;
					// 	referrer = `${location}`.replace(hash, (hash = `#${href}`));
					// 	src = `${new URL(href, referrer)}`;
					// 	history.replaceState({hashes}, title, referrer);
					// }
				}

				hash || (hash = '#');
				hashes[hash] ? ({referrer, href, src} = hashes[hash]) : (hashes[hash] = {referrer, href, src});

				// console.log({hashes, hash, referrer, href, src});

				history.replaceState({hashes}, title, `${location}`);

				if (href === section.sourceURL) return;

				await (section.load ? section.load(href) : section.setAttribute('src', href));
			};
			section.baseURL || ((section.baseURL = location.href.replace(/[?#].*$|$/, '')) && load());
			addEventListener('hashchange', load, {passive: true});
		}

		// Only bootstrap markout-content if not already bootstrapped
		if (typeof section.load !== 'function' || !section.matches(':defined')) {
			const url = new URL(import.meta.url);
			location.search.length > 1 && (url.search += `${url.search ? '&' : '?'}${location.search.slice(1)}`);
			url.search && (url.search = `?${[...new Set(url.search.slice(1).split('&'))].sort().join('&')}`);
			// const DEV =  /^\?dev\b|\&dev\b/i.test(location.search);
			const DEV = /[?&]dev\b/.test(url.search);
			const LIB = `${markoutBase}${DEV ? 'lib/browser.js' : 'dist/browser.m.js'}${url.search}`;
			dynamicImport(new URL(LIB, markoutBase));
		}
	}
}
// const DEV = /[?&]dev\b/.test(import.meta.url) || /^\?dev\b|\&dev\b/i.test(location.search);

// const {origin, pathname} = location; = location.href.slice(root.length,
// const MarkoutPreviewBase = /\/?markout\/preview\.js\b.*$/i;
// const MarkoutBase = /\/?markout(?:\/.*)?$/i;
// const RootBase = /\/?$/;

// const base = MarkoutPreviewBase.test(import.meta.url)
// 	? import.meta.url.replace(MarkoutPreviewBase, '/')
// 	: origin
// 	? origin.replace(RootBase, MarkoutBase.test(pathname) ? pathname.replace = location.href.slice(root.length, (MarkoutBase, '/') : '/')
// 	: `${new URL('./', location)}`;

// if (!section.hasAttribute('src')) {
// 	const src =
// 		(link && ({href, title} = link) && href) ||
// 		((hash = location.hash) && (hash = hash.trim().slice(1)) && (href = `${new URL(hash, origin)}`)) ||
// 		((title = 'Markout'), `${base}./markout/README.md`);

// 	title ||
// 		((title = `${href.replace(/(.*?)((?:[^/]+?\/?){1,2})(?:\..*|)$/, '$2')}`.trim()) &&
// 			(document.title = `${title} — Markout`));

// 	section.setAttribute('src', src);
// }

// const LIB = `./${DEV ? 'lib/browser.js' : 'dist/browser.m.js'}`;

// async ({oldURL, newURL}) => {
// 	if (oldURL !== newURL) {
// 		await new Promise(requestAnimationFrame);
// 		load(location);
// 	}
// },
