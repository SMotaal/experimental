import loader from './loader.js';
import {Package} from './package.js';

const packages = {};

(packages.ready = (async () => {
	const manifest = JSON.parse(await loader.load('./packages.json'));

	for (const key in manifest) {
		packages[key] = new Package(manifest[key]);
	}

	return packages;
})());

export default packages;

// const proxy = Object.setPrototypeOf(packages, new Proxy({}, {
//   get: (target, property) => {
//     return property in packages ? packages[target] : ready.then(() => packages[target]);
//   }
// }))

// packages.then = ƒ => ready.then(() => ƒ(packages));
// packages.catch = ƒ => ready.catch(ƒ);
// packages.finally = ƒ => ready.finally(ƒ);

// Object.setPrototypeOf(packages, {
// 	then: ƒ => ready.then(() => ƒ(packages)),
// 	catch: ƒ => ready.catch(ƒ),
// 	finally: ƒ => ready.finally(ƒ),
// });
