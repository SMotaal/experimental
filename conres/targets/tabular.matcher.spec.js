import {options} from './tabular.spec.js';
import {loadSourceTextFrom, matchAll, LineBreaks, dynamicImport, createBlobURL, createDataURL} from './helpers.js';
import {tabular} from './tabular.grammar.js';

const $tabular = (globalThis.$tabular = async (...args) => {
	const {load, normalize} = $tabular;
	const {copy} = {...args[args.length - 1]};

	const sourceText = await load(
		(args[0] && typeof args[0] === 'string') ||
			(typeof args[0] === 'object' && args[0] instanceof URL && args[0]) ||
			undefined,
	);

	if (!sourceText) return;

	const normalizedText = normalize(sourceText);

	const debugMatcher =
		options.segmentation &&
		($tabular.debugMatcher ||
			($tabular.debugMatcher = (await dynamicImport('/modules/matcher/matcher.debug.js')).debugMatcher));

	const debugOptions = {
		method: 'render',
		colors: Object.assign([...debugMatcher.colors], {
			row: '#CCCC00',
			feed: '#FF0066',
			slug: '#00CCCC',
			empty: '#FF6600',
			numeric: '#00FF66',
			sequence: '#00CCFF', // 00FF66
			unit: '#6600FF',
			comment: '#CC00CC',
		}),
	};

	const rendering = debugOptions.method === 'render';

	const loggers = [];

	groupCollapsed(`Source ‹${typeof sourceText}›`);
	log(
		'%c%s',
		'white-space: pre; tab-size: 20em; display: block; font-size: smaller;',
		LineBreaks.replace(normalizedText),
	);
	groupEnd();
	groupCollapsed(`Grammar ‹Tabular›`);
	log(tabular);
	groupEnd();

	let html = '';

	const parsed = {};
	const segments = (parsed.segments = []);
	const sections = (parsed.tables = []);

	let rows;

	const segmenters = Object.freeze({
		feed: feed => {
			loggers.push(() => {
				const rendered = debugMatcher.matches([feed], debugOptions);
				rendered.length && (html += `<div>\n\t${rendered.join('\n\t')}\n</div>`);
			});
			rows && rows.length && ((rows.feed = feed[0]), (rows.index = sections.push(rows) - 1));
			rows = undefined;
			return feed;
		},
		slug: slug => {
			loggers.push(() => {
				const rendered = debugMatcher.matches([slug], debugOptions);
				rendering && rendered.length && (html += `<div>\n\t${rendered.join('\n\t')}\n</div>`);
			});
			(rows || (rows = [])).slug = slug[0];
			return slug;
		},
		row: tabular.matcher.row
			? row => {
					const matches = [...matchAll(row[0], tabular.matcher.row)];
					loggers.push(() => {
						const rendered = debugMatcher.matches([row], debugOptions);
						const cells = debugMatcher.matches(matches, debugOptions);
						rendering &&
							(cells.length && rendered.push(`\n\t<output>${cells.join('\n\t\t')}\n\t</output>`),
							rendered.length && (html += `<div>\n\t${rendered.join('\n\t')}\n</div>`));
					});
					return matches;
			  }
			: row => {
					const cells = row[0].split('\t');
					loggers.push(() => {
						const rendered = debugMatcher.matches([row], debugOptions);
						rendering && rendered.length && (html += `<div>\n\t${rendered.join('\n\t')}\n</div>`);
					});
					return cells;
			  },
		// unknown: unknown => {
		// 	loggers.push(() => {
		// 		const rendered = debugMatcher.matches([unknown], debugOptions);
		// 		rendering && rendered.length && (html += `<div>\n\t${rendered.join('\n\t')}\n</div>`);
		// 	});
		// 	return unknown;
		// },
	});

	for (const match of [...matchAll(normalizedText, tabular.matcher)]) {
		const segmenter = match && segmenters[match.identity];
		segments.push(segmenter ? segmenter(match) : match);
	}

	for (const section of sections) {
		if (!section) continue;
		group('%s (%d:%d)', section.slug || section[0][0], section.length, section[0].length);
		table([...section]);
		groupEnd();
	}

	log(parsed);

	for (const logger of loggers) logger();

	if (html) {
		const innerHTML = `<style>\n\t${RENDERED_STYLE}\n</style>\n<output>${html}</output>`;
		if (typeof copy === 'function') {
			copy(innerHTML);
			console.log('copied');
		} else {
			const {template = ($tabular.template = document.createElement('template'))} = $tabular;
			template.innerHTML = `<!DOCTYPE html>\n<html>\n<head>\n\t<meta charset="utf-16" />\n</head>\n<body>\n${innerHTML}\n</body>\n</html>\n`;
			// if (typeof safari === 'object') return console.log(template);
			const body = template.innerHTML;
			const url = [createBlobURL, createDataURL][0](body, {type: 'text/html'});
			open(url, '_blank');
			/^blob:/.test(url) && setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}
});

$tabular.parse = async specifier => {};

$tabular.normalize = text => text.replace(/((?=^ *)|(?= *$)|[^\r\n\t\s] (?= *[^\r\n\t\s])|) */gm, '$1');

$tabular.load = async specifier => {
	const url = specifier ? new URL(specifier, location) : `${new URL(`./examples/${options.example}`, import.meta.url)}`;
	const sourceText = await loadSourceTextFrom(url);
	if (sourceText) return sourceText;
	warn(`The requested location %O returned %O`, specifier || `${url}`, sourceText);
};

const {log, warn, group, groupCollapsed, groupEnd, table, time, timeEnd} = console;

const RENDERED_STYLE = (css => css`
	@import 'https://www.smotaal.io/pholio/styles/fonts/iosevka/iosevka.css';

	html {
		max-width: 100vw;
		min-height: 100vh;
		-webkit-text-size-adjust: 100%;
		margin: 0;
		padding: 0;
	}

	body {
		min-height: inherit;
		max-width: inherit;
		/* display: grid; */
		margin: 0;
		padding: 0;
	}

	output,
	output * {
		box-sizing: content-box;
		border-collapse: collapse;
	}

	output {
		display: inline-grid;
		grid-auto-flow: row;
		grid-auto-rows: minmax(min-content, max-content);
		grid-gap: 0.5em;
		align-content: center;
		align-items: baseline;
		margin: 1em 0;
		tab-size: 4;
		font-family: 'Iosevka Web', monospace;
		line-height: 133%;
	}

	output pre {
		position: relative;
		line-break: loose;
		white-space: pre-wrap;
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(min-content, max-content);
		place-content: start;
		align-items: baseline;
		margin: 0;
		scroll-snap-align: start;
	}

	output output {
		margin-left: 8em;
		font-size: 90%;
	}

	output pre > span {
		display: inline-block;
	}

	output pre tt.tab {
		text-decoration-line: line-through;
		text-decoration-width: 2px;
		text-decoration-thickness: 2px;
		padding: 0 0.25em;
		display: inline-block;
		tab-size: 1.5;
		border-left: 2px solid currentColor;
		border-right: 2px solid currentColor;
		transform: scaleY(0.75) scaleX(0.9);
		opacity: 0.75;
	}

	output output > pre::before {
		content: counter(index) ':';
		color: #9996;
		overflow-x: visible;
		text-align: right;
		margin-left: -4em;
		margin-right: 0;
	}

	output output > pre:first-child {
		counter-reset: index 0;
	}

	output output > pre + pre {
		counter-increment: index;
	}

	@media only screen {
		body {
			overflow-x: hidden;
			overflow-y: scroll;
			overflow-anchor: auto;
			columns: 45em;
			/* font-size: calc(0.75rem + 0.5vmin + 0.25vmax); */
		}

		output,
		output pre {
			contain: layout;
		}

		output pre span:hover::after {
			content: var(--details);
			float: right;
			/* position: absolute; */
		}
	}

	@media print {
		body {
			font-size: 10pt;
		}
	}

	pre,
	span {
		page-break-before: auto;
		page-break-inside: avoid;
		box-sizing: border-box;
	}
`)(String.raw);
