{
	const {log} = console;

	/**
	 * @param {string|{toString}} aspect
	 */
	const debug = async (aspect, ...args) => {
		log(
			`%c%s%c %O`,
			`background: ${debug.colors[aspect] || '#69F'}; color: white; border-radius: 2px;`,
			` ${aspect} `,
			'',
			...(debug.serialize ? args.map(debug.serialize) : args),
		);
	};
	debug.colors = {
		default: '#AAA',
		scoped: '#CC0',
		sandboxed: '#0C3',
		unsandboxed: '#E90',
		blocked: '#F33',
		error: '#F00',
	};

	Object.defineProperty(console, Symbol.for('debug'), {value: debug, enumerable: false, configurable: false});
}
