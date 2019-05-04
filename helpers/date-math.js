((
	{date = new Date(), days = -7, day = 5} = {},
	{
		remap = (value, ...mappers) => mappers.reduce((v, r) => v.map(r), value),
		format = date => new Date(date).toISOString(),
		alias = value => (value.setHours(24 * ((value.getHours() - 12) % 12 > 0), 0, 0, 0), value),
		relative = (date, days) => ((date = new Date(date)), 0 + days && date.setDate(date.getDate() + days), date),
		nearest = (value = new Date(), {ends = 5, day = value.getDay(), date = value.getDate()} = {}) => (
			value.setDate(date - day + ends + (7 * day > ends)), value
		),
		range = (...dates) =>
			dates.length === 1 ? [dates[0], dates[0]] : dates.length ? [dates.sort()[0], dates[1]] : dates,
	} = {},
) => remap(range(nearest(date, {ends: day}), relative(date, days)), alias, format))();

///

console.table(
	((
		array = Array(14).fill(),
		pad = (v, n) => `${v}`.padStart(1 + (~~Math.log10(length) || 0), '0'),
		format = date => `${date}`,
		alias = value => (
			value.setHours(24 * ((value.getHours() - 12) % 12 > 0)),
			value.setMilliseconds(~~(value.getMilliseconds() / (24 * 60 * 60 * 100)) * 24 * 60 * 60 * 100),
			value
		),
		reset = (value = new Date(), {becomes = 5, ends = becomes, day = value.getDay(), date = value.getDate()} = {}) => (
			value.setDate(date - day + becomes + (day > ends ? 7 : 0)), value
		),
		reducer = (r, v, i, {length}) => (
			(r[`${pad(i, length)} ${format((v = alias(new Date(`2019-03-${pad(1 + i, 2)}Z-04`))))}`] = format(reset(v))), r
		),
	) => array.reduce(reducer, {}))(),
);

// console.table((Array(49).fill().map((v, i) => [i = i-24, i > 12 ? 24 : 0]).map(([value, expected], i) => ({value, expected, actual: 24 * ((value - 12) % 12 > 0)}))))

// 	((
// 		pad = (v, n) => `${v}`.padStart(1 + (~~Math.log10(length) || 0), '0'),
// 		reduce = (array, ...args) => array.reduce(...args),
// 		format = date => `${date}`,
// 		alias = value => (
// 			value.setHours(24 * ((value.getHours() - 12) % 12 > 0)),
// 			value.setMilliseconds(~~(value.getMilliseconds() / (24 * 60 * 60 * 100)) * 24 * 60 * 60 * 100),
// 			value
// 		),
// 		reset = (value = new Date(), {becomes = 5, ends = becomes, day = value.getDay(), date = value.getDate()} = {}) => (
// 			value.setDate(date - day + becomes + (day > ends ? 7 : 0)), value
// 		),
// 	) =>
// 		reduce(
// 			Array(14).fill(),
// 			(r, v, i, {length}) => (
// 				(r[`${pad(i, length)} ${format((v = alias(new Date(`2019-03-${pad(1 + i, 2)}Z-04`))))}`] = format(reset(v))), r
// 			),
// 			{},
// 		))(),
// );
