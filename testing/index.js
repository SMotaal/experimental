import {async, scope, mocha} from './modules/mocha.js';

async(api => {
	console.log(
		'setup',
		mocha.setup({
			ui: 'tdd',
			// ignoreLeaks: true,
			asyncOnly: true,
		}),
	);

	console.log(scope);

	api.suite('sum', function() {
		api.test('should return sum of arguments', async () => null);
	});

	mocha.checkLeaks();
	mocha.run();

	// console.log({mocha, namespace: {...namespace}});

	// console.log({bdd: mocha.setup('bdd'), namespace: {...namespace}});
	// const {describe, it} = mocha;
});

// (async () => void console.log(await (await import('./modules/mocha.js')).ready))();
