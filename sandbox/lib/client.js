import '../elements/sandbox-toolbar.js';
import '../elements/sandbox-console.js';
import '../elements/sandbox-frame.js';
// import '/markout/elements/markout-content.js';

addEventListener('hashchange', () => {
	const hash = `${location.hash || ''}`.slice(1);
	const frame = document.querySelector('sandbox-frame');
	hash && frame && (frame.src = new URL(`./containers/${hash}/`, location));
});
