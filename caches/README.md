﻿# Caches (_experimental-2_)

A while back I explored the idea of declarative html bundle:

```html
<template is="cache-entries" directory="bundle">
	<!-- Content cached to tests/caches/bundle.html/<file> -->
	<script file="log-current-script.js" type="text/javascript">
		console.log('caches <log-current-script.js> — currentScript = %o', document.currentScript);
	</script>
	<script file="export-default-1.mjs" type="text/javascript">
		const exported = {default: 1};
		console.log('caches <export-default-1.mjs> — export %o', exported);
		export default exported.default;
	</script>
	<script file="export-default-url.mjs" type="text/javascript">
		const exported = {default: import.meta.url};
		console.log('caches <export-default-url.mjs> — export %o', exported);
		export default exported.default;
	</script>
	<style file="style.css" type="text/css">
		@import 'theme.css';
		.styled {
			color: var(--color, red);
		}
	</style>
	<style file="theme.css" type="text/css">
		:root {
			--color: green;
		}

		.styled.blue {
			--color: blue;
		}
	</style>
	<template file="index.html" type="text/html">
		<html>
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
				<script type="text/javascript" src="log-current-script.js"></script>
				<script type="module" src="export-default-1.mjs"></script>
				<script type="module" src="export-default-url.mjs"></script>
				<link rel="stylesheet" href="style.css" />
			</head>

			<body>
				<p class="styled">Styled {{timestamp}}</p>
				<p class="styled blue">Styled Blue {{timestamp}}</p>
				<script type="module">
					import * as default_1 from './export-default-1.mjs';
					import * as default_url from './export-default-1.mjs';
					console.log('caches <index.html> — import %o', {
						'export-default-1.mjs': default_1,
						'export-default-1.mjs': default_url,
					});
				</script>
			</body>
		</html>
	</template>
	<!-- End of content cached to tests/caches/bundle.html/<file> -->
</template>
```