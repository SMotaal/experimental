import * as types from './types.js';

/// Target Definition

const setMatch = (target, value) => {
	Object.defineProperty(target, '[[match]]', {value, enumerable: false, configurable: false, writable: false});

	return target;
};

const setSlug = (context, aspect) => {
	context.nextSlug && ((context.lastSlug = aspect.slug = context.nextSlug), (context.nextSlug = undefined));
	return aspect;
};

const createTable = context => {
	const table = {rows: new types.Rows(), headers: new types.Headers(), columnUnits: [], columnPaths: []};

	context.nextSlug && setSlug(context, table);
	context.tables.push((context.currentTable = table));

	return table;
};

const processRecord = (context, match, matches) => {
	const records = context.records;
	const record = new types.Record();

	context.currentTable = undefined;
	setMatch(record, match);
	records.push(record);
	processCells(context, record, matches);

	return record;
};

const processCells = (context, row, matches) => {
	const table = row.table;
	const tableUnit = table && table.unit;
	const columnUnits = table && table.columnUnits;
	const rowUnit = matches[0] && matches[0].capture.unit;
	// let tableUnit = row.table.unit;
	let cellUnit;
	let columnIndex = 0;
	for (const match of matches) {
		let {
			0: text,
			identity: type,
			capture: {DELIMITER, [type]: value, ...properties},
		} = match;
		// properties.rowUnit = rowUnit;
		// properties.columnUnit = ;
		cellUnit =
			properties.unit ||
			(properties.unit =
				rowUnit || (!columnUnits || columnUnits[columnIndex] === undefined ? tableUnit : columnUnits[columnIndex]));

		properties.columnIndex = columnIndex++;

		const cell =
			type === 'comment'
				? types.Comment.from((properties.text = text.trim()), properties)
				: typeof value === 'number'
				? cellUnit === '%'
					? ((properties.text = `${value}%`), types.Percentage.from(value / 100, properties))
					: cellUnit
					? ((properties.text = `${value} ${cellUnit}`), types.Numeric.from(value, properties))
					: ((properties.text = `${value}`), types.Numeric.from(value, properties))
				: value === 'YES' || value === 'NO'
				? ((properties.text = value), types.Switch.from(value === 'YES', properties))
				: value === ''
				? ((properties.text = ''), types.Value.from('', properties))
				: ((properties.text = `“${(value = value.trim())}”`), types.Sequence.from(value, properties));
		row.push(setMatch(cell, match));
	}
	return row;
};

export const processRow = (context, match) => {
	const cells = [...match.capture.cells];
	if (cells.length === 2 || (cells.length === 3 && cells[2].identity === 'comment')) {
		return processRecord(context, match, cells);
	}

	const row = new types.Row();
	setMatch(row, match);
	const table = (row.table = context.currentTable || createTable(context));
	context.nextSlug && setSlug(context, row);

	let isHeader = !table.length && table.headers.length < 2 && cells.length > 2;
	if (isHeader) {
		for (let i = 1, n = cells.length; --n; i++) {
			if ((isHeader = cells[i].identity === 'sequence')) break;
		}
	}
	if (!isHeader) {
		row.isHeader = false;
		table.rows.push(row);
	} else {
		row.isHeader = true;
		for (let i = 1, n = cells.length; --n; i++) {
			const match = cells[i];
			if (match.identity === 'sequence') {
				if (match.capture.sequence) {
					table.columnPaths[i] = table.columnPaths[i]
						? `${table.columnPaths[i]} : ${match.capture.sequence}`
						: match.capture.sequence;
				}
				if (match.capture.unit) {
					table.columnUnits[i] = match.capture.unit;
				} else if (i === 1 && match[0] === 'Positions\t') {
					table.columnUnits[i] = '';
				}
			}
		}
		if (table.headers.length === 0 && cells[0]) {
			if (cells[0].capture.unit) {
				table.unit = cells[0].capture.unit;
			} else if (table.slug) {
				const unit = /\((\b\D\S+(?:\b[.%]?|\b))\)/.exec(table.slug[0]);
				if (unit) {
					table.unit = unit[1];
				}
			}
		}
		table.headers.push((table.rows[`#${table.headers.length}`] = row));
	}

	processCells(context, row, cells);
	return row;
};

// /** @type {import('/modules/matcher/matcher').Matcher} Matcher */
// /** @type {import('/modules/matcher/matcher').Matcher.MatchResult} MatchResult */
