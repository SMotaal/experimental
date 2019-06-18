//@ts-check

// import {debugMatcher} from '/modules/matcher/matcher.debug.js';
import {LineBreaks} from '../normalizer.js';

/// Defaults

export const colors = {
	row: '#CCCC00',
	feed: '#FF0066',
	slug: '#00CCCC',
	empty: '#FF6600',
	numeric: '#00FF66',
	sequence: '#00CCFF',
	unit: '#6600FF',
	comment: '#CC00CC',
};

/// Renderers
export const createDebuggingInterface = debugMatcher => {
	// TODO: remove after refactor
	const debugging = {
		render: {
			loggers: (loggers, debugOptions = debugging.options) => {
				const output = [];
				for (const logger of loggers) output.push(logger(debugOptions));
				return output.filter(Boolean).join('');
			},
			/** @param {DebugOptions} debugOptions */
			match: (match, debugOptions, ...submatches) => {
				const rendered = debugMatcher.matches([match], debugOptions);
				return (
					(rendered.length &&
						((rendered['submatches'] =
							submatches && submatches.length && debugging.render.submatches(submatches, debugOptions)) &&
							rendered.push(rendered['submatches'])),
					/* html */ `<div>\n\t${rendered.join('\n\t')}\n</div>`) || ''
					// /* html */ `<div style="display: flex; flex-flow: column;">\n\t${rendered.join('\n\t')}\n</div>`) || ''
				);
			},
			submatches: (submatches, debugOptions) => {
				const rendered = submatches.length && debugMatcher.matches(submatches, debugOptions);
				return (rendered && rendered.length && /* html */ `\n\t<output>${rendered.join('\n\t\t')}\n\t</output>`) || '';
			},
		},
		renderers: {
			/** @param {MatchResult} feed */
			feed: feed =>
				/** @param {DebugOptions} debugOptions */
				(debugOptions = debugging.options) => debugging.render.match(feed, debugOptions),
			/** @param {MatchResult} slug */
			slug: slug =>
				/** @param {DebugOptions} debugOptions */
				(debugOptions = debugging.options) => debugging.render.match(slug, debugOptions),
			/** @param {MatchResult} row */
			row: row =>
				/** @param {DebugOptions} debugOptions */
				(debugOptions = debugging.options) => debugging.render.match(row, debugOptions, ...row.capture['cells']),
		},
		log: {
			matcher: matcher => {
				groupCollapsed(`Matcher`), log(matcher), groupEnd();
			},
			sourceText: sourceText => {
				groupCollapsed(`Source ‹${typeof sourceText}›`),
					log(
						'%c%s',
						'white-space: pre; tab-size: 20em; display: block; font-size: smaller;',
						LineBreaks.replace(sourceText),
					),
					groupEnd();
			},
			context: context => {
				log(context);
				debugging.log.records(context.records);
				debugging.log.tables(context.tables);
			},
			records: records => {
				if (records && records.length) table(records, ['0', '1', '2']);
			},
			tables: tables => {
				if (tables && tables.forEach) tables.forEach(debugging.log.table);
			},
			table: table => {
				if (table && table.rows) debugging.log.rows(table.rows);
			},
			rows: rows => {
				if (rows && rows.length) {
					table(rows);
					// table(rows, [...rows[rows.length - 1]].map((v, i) => `${i}`));
				}
			},
		},
		output: {
			/** @param {string} html */
			htmlFragment: html => /* html */ `<style>\n\t${style}\n</style>\n<output>${html}</output>`,
			/** @param {string} html */
			htmlDocument: html =>
				/* html */ `<!DOCTYPE html> \n<html>\n<head>\n\t<meta charset="utf-16" />\n</head>\n<body>\n\t<script type="text/javascript">document.documentElement.className="rendered"</script>\n${debugging.output.htmlFragment(
					html,
				)}\n</body>\n</html>\n`,
		},
		/** @type {DebugOptions} */
		//@ts-ignore
		options: {
			method: 'render',
			colors: Object.assign([...debugMatcher.colors], colors),
		},
	};

	return debugging;
};

/// HTML

const style = String.raw/*css*/ `
	@import 'https://www.smotaal.io/fonts/iosevka.css';

	:root {
		color-scheme: light dark;
	}

	@media screen and (prefers-color-scheme: dark) {
		html.rendered {
			background: var(--shade-dark, #101010);
			/* background: radial-gradient(#000a, #000e), var(--shade, #333); */
			/* background: linear-gradient(to right, #000a 0%, #0009 50%, #000a 100%), linear-gradient(to bottom, #000a 0%, #0009 50%, #000a 100%), var(--shade, #333); */
			/* background-blend-mode: hard-light; */
			background-attachment: fixed;
			background-origin: border-box;
		}
	}

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
		-webkit-tab-size: 4;
		-moz-tab-size: 4;
		tab-size: 4;
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
`;

const {log, warn, group, groupCollapsed, groupEnd, table, time, timeEnd} = console;

/** @typedef {import('/modules/matcher/matcher.types').Matcher.MatchResult} MatchResult */
/** @typedef {import('/modules/matcher/matcher.types').Matcher.DebugOptions} DebugOptions */
