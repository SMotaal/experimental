import {options} from './tabular.spec.js';
import {loadSourceTextFrom, matchAll, LineBreaks, Tabs, dynamicImport} from './helpers.js';
import {parse, tokenize} from './tabular.parser.js';
import {tabular} from './tabular.grammar.js';

const $tabular = (globalThis.$tabular = async specifier => {
	const {load, normalize} = $tabular;
	const sourceText = await load(specifier);

	if (!sourceText) return;

	const normalizedText = normalize(sourceText);

	const debugSegmenter =
		options.segmentation && (await dynamicImport('/modules/segmenter/segmenter.debug.js')).debugSegmenter;

	const debugSegmenterOptions = {grouping: false};
	const DUMP_SEGMENTS = false;

	debugSegmenter &&
		(Object.assign((tabular.segmenter.colors = [...debugSegmenter.colors]), {
			row: '#CCCC00', // 66FF00
			feed: '#FF0066', // 00CCFF
			slug: '#00CCCC',
		}),
		tabular.segmenter.row &&
			Object.assign((tabular.segmenter.row.colors = [...debugSegmenter.colors]), {
				empty: '#FF6600',
				numeric: '#00FF66',
				sequence: '#00CCFF', // 00FF66
				unit: '#6600FF',
				comment: '#CC00CC',
			}));

	const loggers = [];

	// debugSegmenter && debugSegmenter(tabular.segmenter, normalizedText);

	groupCollapsed(`Source ‹${typeof sourceText}›`);
	log(
		'%c%s',
		'white-space: pre; tab-size: 20em; display: block; font-size: smaller;',
		LineBreaks.replace(normalizedText),
	);
	groupEnd();

	const parsed = {};
	const segments = (parsed.segments = []);
	const sections = (parsed.tables = []);

	let rows;

	const feed = text => {
		rows && rows.length && ((rows.feed = text), (rows.index = sections.push(rows) - 1));
		rows = undefined;
	};

	let html = '';

	const row = text => {
		const cells = text.split('\t');
		const grouped = false && tabular.segmenter.row;
		if (debugSegmenter) {
			loggers.push(
				DUMP_SEGMENTS
					? async () => {
							await debugSegmenter(tabular.segmenter, text, {
								...debugSegmenterOptions,
								method: grouped ? 'group' : undefined,
							});
							if (tabular.segmenter.row) {
								await debugSegmenter(tabular.segmenter.row, text, debugSegmenterOptions);
								grouped && groupEnd();
							}
					  }
					: async () => {
							const rendered = [];
							rendered.push(...debugSegmenter(tabular.segmenter, text, {method: 'render'}));
							if (tabular.segmenter.row) {
								const body = debugSegmenter(tabular.segmenter.row, text, {method: 'render'});
								if (body.length) rendered.push(`\n\t<output>${body.join('\n\t\t')}\n\t</output>`);
							}
							html += `<div>\n\t${rendered.join('\n\t')}\n</div>`;
					  },
			);
		}
		// Object.defineProperties(cells, {index: {value: (rows || (rows = [])).push(cells) - 1, enumerable: false}});
		return cells;
	};

	const slug = text => {
		if (debugSegmenter) {
			loggers.push(
				DUMP_SEGMENTS
					? async () => {
							await debugSegmenter(tabular.segmenter, text, debugSegmenterOptions);
					  }
					: async () => {
							const rendered = debugSegmenter(tabular.segmenter, text, {method: 'render'});
							html += `<div>\n\t${rendered.join('\n\t')}\n</div>`;
					  },
			);
		}
		(rows || (rows = [])).slug = text;
	};

	for (const {0: text, type, ...match} of matchAll(normalizedText, tabular.segmenter)) {
		const tokens = [...tokenize(text)];

		const segment = {text, type, match, tokens};

		if (type === 'feed') {
			if (debugSegmenter) {
				loggers.push(
					DUMP_SEGMENTS
						? async () => {
								await debugSegmenter(tabular.segmenter, text, debugSegmenterOptions);
						  }
						: async () => {
								const rendered = debugSegmenter(tabular.segmenter, text, {method: 'render'});
								html += `<div>\n\t${rendered.join('\n\t')}\n</div>`;
						  },
				);
			}
			feed(text);
		} else if (type === 'row') {
			const cells = (segment.row = row(text));
		} else if (type === 'slug') {
			slug(text);
		}

		segments.push(segment);
	}

	for (const section of sections) {
		if (!section) continue;
		group('%s (%d:%d)', section.slug || section[0][0], section.length, section[0].length);
		table([...section]);
		groupEnd();
	}

	log(parsed);

	if (loggers.length) {
		for await (const logger of loggers) {
			logger();
		}
	}
	if (html) {
		const figure = document.createElement('figure');
		figure.setAttribute('hidden', true);
		figure.innerHTML = `<style>\n\t${RENDERED_STYLE.replace(/^/gm, '\t')}\n</style>\n<output>${html}</output>`.replace(
			/ *line-height: 1.75em;((?= *['"])| |) */g,
			'',
		);
		document.body.appendChild(figure);
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
		position: relative;
	}

	output pre tt.tab::after {
		display: inline-grid;
		content: '\2192';
		place-self: center;
		position: absolute;
		text-align: center;
		left: 0;
		right: 0;
		margin: 0;
		font-weight: 100;
		/* outline: 1px solid red; */
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
			font-size: calc(0.75rem + 0.5vmin + 0.25vmax);
			/* transition: font-size 0.5s ease-out; */
			/* will-change: transition; */
		}

		output,
		output pre {
			contain: layout;
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
