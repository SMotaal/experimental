(async ({
	since = '2019-03-12',
	offset,
	projects = {
		Components: {repo: 'Smotaal/components'},
		Console: {repo: 'Smotaal/console'},
		ESM: {repo: 'Smotaal/esm'},
		Experimental: {repo: 'Smotaal/experimental'},
		Markup: {repo: 'Smotaal/markup'},
		Pholio: {repo: 'Smotaal/pholio'},
		Quench: {repo: 'Smotaal/quench'},
		'smotaal.io': {repo: 'Smotaal/smotaal.github.io'},
		'conres.app': {repo: 'ConRes/conres.github.io'},
	},
} = {}) => {
	const API = `https://api.github.com`;

	//* SEE: https://developer.github.com/v3/repos/commits/
	const [SINCE, UNTIL] = ((
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

	const QUERY = `since=${SINCE}&until=${UNTIL}`;

	const records = {};
	const commits = {};
	const errors = {};
	let successes = 0,
		failures = 0;

	for await (const [project, {repo}] of Object.entries(projects)) {
		const record = (records[project] = {project, repo});
		try {
			record.url = `${API}/repos/${repo}/commits?${QUERY}`;
			record.request = fetch(record.url);
			record.response = await record.request;
			record.commits = commits[project] = await record.response.json();
			successes++;
		} catch (exception) {
			errors[project] = record.error = (exception.stack, exception);
			failures++;
		}
	}

	if (successes + failures) {
		const {log, group, groupEnd, warn, table} = console;

		group('Project Commits');

		for (const project in projects) {
			group(project);
			log(projects[project]);
			commits[project] && table(commits[project]);
			errors[project] && warn(errors[project]);
			groupEnd();
		}

		failures && table([{API, SINCE, UNTIL, QUERY}]);

		groupEnd();

		log({commits, errors});
	}

	return commits;
})();

// const TIMEZONE = `${0 - new Date().getTimezoneOffset() / 60}`.replace(/^(-)?(\d+)(?:.(\d+)|)$/, (m, sg, hr, mv) => `${sg || '+'}${hr.padStart(2, '0')}${mv ? `:${mv * 60}` : ''}`);
