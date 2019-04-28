(async currentScript => {
	let container, parent, root;
	try {
		(currentScript && currentScript.parentElement.matches('output')) ||
			(await Promise.reject(Error(`Markout: Failed to run "tokens.spec.js" script`)));

		(container = (root = currentScript.parentElement
			.appendChild((parent = document.createElement('div')))
			.attachShadow({mode: 'open'})).appendChild(document.createElement('div'))).innerHTML =
			'<center style="color: #999">Loading…</center>';

		for (
			let n = 5, idle;
			!globalThis.FDF &&
			(n-- ||
				// !await import(new URL('./tabular.matcher.spec.js', (currentScript && currentScript.src) || location))
				(await Promise.reject(Error(`Fail: FDF is undefined`))));
			await new Promise(idle || (idle = resolve => setTimeout(resolve, 200)))
		);
		container.innerHTML = '<center style="color: #999">Generating…</center>';
		await new Promise(requestAnimationFrame);

		FDF({container});

		Object.assign(root.appendChild(document.createElement('style')), {
			textContent: (css => css`
				:host(:not(:active)) > div {
					pointer-events: none;
				}
				:host {
					user-select: none;
					-webkit-user-select: none;
					-moz-user-select: none;
					cursor: default;
				}
			`)(String.raw),
		});
	} catch (exception) {
		container && (container.innerHTML = `<center style="color: red">${exception}</center>`);
		throw (exception.stack, exception);
	}
})(
	/** @type {HTMLScriptElement {parentElement: HTMLOutputElement}} */
	document['--currentScript--'] || document.currentScript,
);
