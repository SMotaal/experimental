(({
	methods = ['exec', Symbol.search],
	regexps = [/\)\|/, /\)(?=\|)/, /(?=\)\|)./, /(?=\)\|)\)/, /(?=\)\|)/, /(?=(\))\|)/],
	string = 'abc(def)',
	cycles = 1000,
} = {}) => {
	let remain, result, timer, index;
	const {time, timeEnd} = console;
	const results = {};
	const [runtime] = /chrome|safari|firefox|node/i.exec(
		(this && this.navigator && this.navigator.userAgent) || (typeof process === 'object' && 'Node'),
	);
	const sources = regexps.concat(regexps);
	for (const method of methods) {
		const {
			[method]: {name = `${method}`},
		} = RegExp.prototype;
		for (const source of sources) {
			timer = `| ${runtime} | \`${source}\` | \`${name}\` |`;
			(remain = 100), (index = 0);
			while (remain--) result = new RegExp(source.source, source.flags)[method](`${string.repeat(index++)}|`);
			const regexp = new RegExp(source.source, source.flags);
			(remain = cycles), (index = 0);
			time(timer);
			while (remain--) result = regexp[method](`${string.repeat(index++)}|`);
			timeEnd(timer);
			results[`${source}[${name}]`] = {string, source, index, returned: result};
		}
	}
	return results;
})({cycles: 5000});
