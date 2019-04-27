(async currentScript => {
	if (!currentScript || !currentScript.parentElement.matches('output'))
		throw Error(`Markout: Failed to run "tokens.spec.js" script`);

	await new Promise(resolve => setTimeout(resolve, 1000));

	// const {FDF} = await import(new URL('./tabular.matcher.spec.js', (currentScript && currentScript.src) || location));

	/** @type {{parentElement: HTMLOutputElement}} */
	const {parentElement} = currentScript;

	parentElement.innerHTML = '';
	const parent = parentElement.appendChild(document.createElement('div'));
	const shadowRoot = parent.attachShadow({mode: 'open'});
	const container = shadowRoot.appendChild(document.createElement('div'));

	FDF({container});

	console.log({parent, shadowRoot, container});

	// const {default: spec} = await import(new URL(
	// 	'./lib/globs.spec.js',
	// 	(currentScript && currentScript.src) || location,
	// ));
	// const logger = {...console};
	// try {
	// 	const {parentElement} = currentScript;
	// 	if (parentElement) {
	// 		logger.dir = (value, options) => {
	// 			parentElement
	// 				.appendChild(document.createElement('pre'))
	// 				.appendChild(document.createElement('code'))
	// 				.appendChild(new Text(value));
	// 		};
	// 		logger.table = object => {
	// 			logger.dir(JSON.stringify(object, null, 2).replace(/\\\\/g, '\\'));
	// 		};
	// 		logger.log = logger.table;
	// 	}
	// } finally {
	// 	try {
	// 		spec({logger});
	// 	} catch (exception) {
	// 		logger.dir(exception);
	// 	}
	// }
})(document['--currentScript--'] || document.currentScript).catch(console.warn);
