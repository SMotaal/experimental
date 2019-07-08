import dynamicImport from '/browser/dynamic-import.js';
import {loadSourceTextFrom} from '/components/lib/fetch.js';
import {createBlobURL, createDataURL} from './lib/helpers.js';
import {matcher} from './lib/tdf/matcher.js';
import {matchAll} from '/modules/matcher/matcher.js';
import {processRow} from './lib/tdf/helpers.js';
import {createDebuggingInterface} from './lib/tdf/debugging.js';

const options = {
	example: 'conres-35x-g.log',
	examples: ['RIT_d CirRe35F/d CirRe35X.LOG', 'RIT_c CirRe35X/c CirRe35X.LOG', 'RIT_e CirRe35/e CirRe35F.log'],
	segmentation: true,
	tokenization: true,
	benchmarks: {},
};

export const FDF = (globalThis.FDF = async (...args) => {
	const {copy, container, method = 'render', timing = method !== 'render'} = {...args[args.length - 1]};

	const sourceText = await FDF.load(
		(args[0] && typeof args[0] === 'string') ||
			(typeof args[0] === 'object' && args[0] instanceof URL && args[0]) ||
			undefined,
	);

	if (!sourceText) return;

	const normalizedText = sourceText;

	/** @type {import('/modules/matcher/matcher.debug.js')['debugMatcher']} */
	const debugMatcher =
		options.segmentation &&
		(FDF.debugMatcher || (FDF.debugMatcher = (await dynamicImport('/modules/matcher/matcher.debug.js')).debugMatcher));

	/** @type {ReturnType<createDebuggingInterface>} */
	const debugging = FDF.debugging || (FDF.debugging = createDebuggingInterface(debugMatcher));

	/** @type {debugging['options']} */
	const debugOptions = {
		...(FDF.debugOptions || (FDF.debugOptions = debugging.options)),
		method: (method && method in console && method) || FDF.debugOptions.method,
	};

	const rendering = debugOptions.method === 'render';

	const loggers = [];

	const segmenters = Object.freeze({
		feed: (feed, context) => {
			rendering && loggers.push(debugging.renderers.feed(feed));
			context.currentTable = undefined;
			return feed;
		},
		slug: (slug, context) => {
			rendering && loggers.push(debugging.renderers.slug(slug));
			context.nextSlug = slug;
			return slug;
		},
		row: (row, context) => {
			processRow(context, row);
			rendering && loggers.push(debugging.renderers.row(row));
			return row;
		},
	});

	rendering || debugging.log.sourceText(sourceText);
	rendering || debugging.log.matcher(matcher);

	timing && time('parsing');
	const segments = FDF.parse({normalizedText, segmenters, context: {tables: [], records: []}});
	timing && timeEnd('parsing');

	if (loggers.length) {
		timing && time('logging');
		const html = debugging.render.loggers(loggers, debugOptions);
		timing && timeEnd('logging');

		if (html) {
			if (copy) {
				if (typeof copy !== 'function')
					throw TypeError(`FDF expects the "copy" parameter to be a function not ${typeof copy}.`);
				copy(debugging.output.htmlFragment(html));
			} else if (container) {
				if (container.nodeType !== document.ELEMENT_NODE)
					throw TypeError(`FDF expects the "container" parameter to be a valid element`);
				container.innerHTML = debugging.output.htmlFragment(html);
			} else if (method === 'render') {
				const {template = (FDF.template = document.createElement('template'))} = FDF;
				template.innerHTML = debugging.output.htmlDocument(html);
				const url = [createBlobURL, createDataURL][0](template.innerHTML, {type: 'text/html'});
				open(url, '_blank');
			}
		}
	}

	debugging.log.context(segments.context);

	{
		const parsed = {};

		for (const [key, value] of segments.context.records) {
			parsed[key] = value;
		}

		let untitled = 0;
		for (const table of segments.context.tables) {
			const slug = table.slug && table.slug[0] && `${table.slug[0]}`;
			if (slug || (table.headers && table.headers.length)) {
				const key =
					slug ||
					(table.headers && table.headers[0] && table.headers[0][0] && `${table.headers[0][0]}`) ||
					(table.rows[0][0] && `${table.rows[0][0]}`) ||
					`Untitled Table #${++untitled}`;
				parsed[key] = table;
			} else {
				for (const row of table.rows) {
					const key = (row[0] && `${row[0]}`) || `Untitled Table #${++untitled}`;
					parsed[key] = row;
				}
			}
		}
		console.log(parsed);
	}
});

FDF.parse = ({normalizedText, segmenters = {}, segments = [], context = segments.context || {}}) => {
	segments.context = context;
	[...matchAll(normalizedText, matcher)].forEach(
		match => match && segments.push(match.identity in segmenters ? segmenters[match.identity](match, context) : match),
	);
	return segments;
};

FDF.load = async specifier => {
	const url = specifier ? new URL(specifier, location) : `${new URL(`./examples/${options.example}`, import.meta.url)}`;
	const sourceText = await loadSourceTextFrom(url);
	if (sourceText) return sourceText;
	warn(`The requested location %O returned %O`, specifier || `${url}`, sourceText);
};

const {warn, time, timeEnd} = console;
