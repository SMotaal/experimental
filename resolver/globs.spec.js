const currentScript = document['--currentScript--'] || document.currentScript;

(async () => {
	const {default: spec} = await import(new URL(
		'./lib/globs.spec.js',
		(currentScript && currentScript.src) || location,
	));

	const logger = {...console};
	try {
		const {parentElement} = currentScript;
		if (parentElement) {
			logger.dir = (value, options) => {
				parentElement
					.appendChild(document.createElement('pre'))
					.appendChild(document.createElement('code'))
					.appendChild(new Text(value));
			};

			logger.table = object => {
				logger.dir(JSON.stringify(object, null, 2).replace(/\\\\/g, '\\'));
			};
			logger.log = logger.table;
		}
	} finally {
		try {
			spec({logger});
		} catch (exception) {
			logger.dir(exception);
		}
	}
})().catch(console.warn);
