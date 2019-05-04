import {options} from './tabular.spec.js';
import {loadSourceTextFrom, matchAll, LineBreaks, dynamicImport, createBlobURL, createDataURL} from './helpers.js';
import {tabular} from './tabular.grammar.js';

export const FDF = (globalThis.FDF = async (...args) => {
	const {load, normalize} = FDF;
	const {copy, container, method = 'render', timing = method !== 'render'} = {...args[args.length - 1]};

	const sourceText = await load(
		(args[0] && typeof args[0] === 'string') ||
			(typeof args[0] === 'object' && args[0] instanceof URL && args[0]) ||
			undefined,
	);

	if (!sourceText) return;

	const normalizedText = normalize(sourceText);

	const debugMatcher =
		options.segmentation &&
		(FDF.debugMatcher || (FDF.debugMatcher = (await dynamicImport('/modules/matcher/matcher.debug.js')).debugMatcher));

	const debugOptions = {
		method: (method && method in console && method) || 'render',
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

	rendering ||
		(groupCollapsed(`Source ‹${typeof sourceText}›`),
		log(
			'%c%s',
			'white-space: pre; tab-size: 20em; display: block; font-size: smaller;',
			LineBreaks.replace(normalizedText),
		),
		groupEnd(),
		groupCollapsed(`Grammar ‹Tabular›`),
		log(tabular),
		groupEnd());

	const segmenters = Object.freeze({
		feed: feed => {
			loggers.push(() => {
				const rendered = debugMatcher.matches([feed], debugOptions);
				return (rendering && rendered.length && `<div>\n\t${rendered.join('\n\t')}\n</div>`) || '';
			});
			// rows && rows.length && ((rows.feed = feed[0]), (rows.index = sections.push(rows) - 1));
			// rows = undefined;
			return feed;
		},
		slug: slug => {
			loggers.push(() => {
				const rendered = debugMatcher.matches([slug], debugOptions);
				return (rendering && rendered.length && `<div>\n\t${rendered.join('\n\t')}\n</div>`) || '';
			});
			// (rows || (rows = [])).slug = slug[0];
			return slug;
		},
		row: row => {
			const {
				capture: {row: captured},
			} = row;
			const matches = captured && (('length' in captured && captures) || (row.capture.row = [...captured]));
			loggers.push(() => {
				const rendered = debugMatcher.matches([row], debugOptions);
				const cells = debugMatcher.matches(matches, debugOptions);
				return (
					(rendering &&
						(cells.length && rendered.push(`\n\t<output>${cells.join('\n\t\t')}\n\t</output>`),
						rendered.length &&
							`<div style="display: flex; flex-flow: column;">\n\t${rendered.join('\n\t')}\n</div>`)) ||
					''
				);
			});
			return matches;
		},
	});

	timing && console.time('parsing');
	const segments = FDF.parse({normalizedText, segmenters});
	timing && console.timeEnd('parsing');

	// log(segments);

	if (!loggers.length) return;

	timing && console.time('logging');
	const html = FDF.dump(loggers);
	timing && console.timeEnd('logging');

	if (html) {
		const innerHTML = `<style>\n\t${RENDERED_STYLE}\n</style>\n<output>${html}</output>`;
		if (copy) {
			if (typeof copy !== 'function')
				throw TypeError(`FDF expects the "copy" parameter to be a function not ${typeof copy}.`);
			copy(innerHTML);
		} else if (container) {
			if (container.nodeType !== document.ELEMENT_NODE)
				throw TypeError(`FDF expects the "container" parameter to be a valid element`);
			container.innerHTML = innerHTML;
		} else if (method === 'render') {
			const {template = (FDF.template = document.createElement('template'))} = FDF;
			template.innerHTML = `<!DOCTYPE html>\n<html class="rendered">\n<head>\n\t<meta charset="utf-16" />\n</head>\n<body>\n${innerHTML}\n</body>\n</html>\n`;
			// if (typeof safari === 'object') return console.log(template);
			const body = template.innerHTML;
			const url = [createBlobURL, createDataURL][0](body, {type: 'text/html'});
			open(url, '_blank');
			// /^blob:/.test(url) && setTimeout(() => URL.revokeObjectURL(url), 1000);
		}
	}
});

FDF.parse = ({normalizedText, segmenters = {}, segments = []}) => {
	[...matchAll(normalizedText, tabular.matcher)].forEach(
		match => match && segments.push(match.identity in segmenters ? segmenters[match.identity](match) : match),
	);
	return segments;
};

FDF.dump = loggers => {
	const output = [];
	for (const logger of loggers) output.push(logger());
	return output.filter(Boolean).join('');
};

FDF.normalize = text => text.replace(/((?=^ *)|(?= *$)|[^\r\n\t\s] (?= *[^\r\n\t\s])|) */gm, '$1');

FDF.load = async specifier => {
	const url = specifier ? new URL(specifier, location) : `${new URL(`./examples/${options.example}`, import.meta.url)}`;
	const sourceText = await loadSourceTextFrom(url);
	if (sourceText) return sourceText;
	warn(`The requested location %O returned %O`, specifier || `${url}`, sourceText);
};

const {log, warn, group, groupCollapsed, groupEnd, table, time, timeEnd} = console;

const RENDERED_STYLE = (css => css`
	@import 'https://www.smotaal.io/pholio/styles/fonts/iosevka/iosevka.css';

	html.rendered {
		max-width: 100vw;
		min-height: 100vh;
		-webkit-text-size-adjust: 100%;
		margin: 0;
		padding: 0;
	}

	html.rendered body {
		min-height: inherit;
		max-width: inherit;
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
		/* display: grid; */
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
		/* position: relative; */
		line-break: loose;
		white-space: pre-wrap;
		/* display: grid; */
		/* grid-auto-flow: column; */
		/* grid-auto-columns: minmax(min-content, max-content); */
		place-content: start;
		align-items: baseline;
		margin: 0;
		scroll-snap-align: start;
		/* z-index: 1; */
	}

	output output {
		margin-left: 8em;
		font-size: 90%;
	}

	output pre > span {
		/* display: inline-block; */
	}

	output pre tt.tab {
		text-decoration-line: line-through;
		text-decoration-width: 1px;
		text-decoration-thickness: 1px;
		padding: 0 0.25em;
		display: inline-block;
		tab-size: 1.5;
		border: 0 solid transparent;
		border-left: 1px solid currentColor;
		border-right: 1px solid currentColor;
		/* font-size: 90%; */
		line-height: 100%;
		/* margin: 0.25em 0; */
		/* overflow: hidden; */
		/* transform: scaleY(0.75) scaleX(0.9); */
		opacity: 0.75;
		/* z-index: -1; */
	}

	output output > pre::before {
		content: counter(index) ' ';
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
		/* output pre > span:hover + *, */
		output pre > span:hover * {
			/* pointer-events: none; */
		}
		output pre > span:hover::after {
			content: var(--details);
			position: absolute;
			display: block;
			right: 0;
			left: 0;
			white-space: pre;
			padding: 0.5ex;
			background: #fff;
			text-shadow: 0 0 0 var(--color, #999);
			color: #9999;
			border: 1px solid var(--color, #999);
			/* overflow: hidden; */
			/* font-size: calc(0.75vw + 0.75vh); */
			/* line-height: 125%; */
			z-index: 1;
		}
	}

	@media print {
		html.rendered body {
			font-size: 10pt;
		}
	}

	pre,
	span {
		page-break-before: auto;
		page-break-inside: avoid;
		/* box-sizing: border-box; */
	}
`)(String.raw);
