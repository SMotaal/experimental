/*

Replace

^(?:((?:\{|\}|(?:\t|  ){2}".*": \[|(?:\t|  ){2}\]|(?:\t|  ){3}\{|(?:\t|  ){3}\}|(?:\t|  ){5}"message":).*\n)|(?:.*\n))


With

$1

*/

/*

copy((data => Object.entries(data).reduce((table, [project, commits]) => (table[project] = commits.map(({message}) => message), table), {}))(JSON.parse(String.raw`{
	"Components": [],
	"Console": [
		{"message": "Refactor dom-console modules"},
		{"message": "Update dom-console"},
		{"message": "Update dom-console.js"},
		{"message": "Update dom-console.js"},
		{"message": "Improve dom-console json rendering"},
		{"message": "Fix dom-console stylesheet sources typo"},
		{
			"message": "Add dom-console dynamic stylesheet link (ie script/module auto-loads styles)"
		},
		{"message": "Add tab-size to dom-console.css"},
		{"message": "Fix dom-console finding the right element"}
	],
	"ESM": [],
	"Experimental": [
		{"message": "Updated modules/alpha use refactored dom-console.mjs"},
		{"message": "Update realms/globals to use refactored dom-console.mjs"},
		{"message": "Update realms/globals styles"},
		{"message": "Create realms/Literals.md"},
		{"message": "Update relams/globals.html"},
		{"message": "Update 2019-03-08.md"},
		{"message": "Update logs"},
		{"message": "Update realms/globals"},
		{"message": "Fix realms/globals execution order"},
		{"message": "Add realms/globals experiment"},
		{"message": "Fix somehow omitted <title> tags around titles"}
	],
	"Markup": [{"message": "Add index.html markout pages"}],
	"Pholio": [
		{"message": "Update styles.css"},
		{
			"message": "Revert \"Fix main width\"\n\nThis reverts commit 6b1d8eaed87b5ce875e2f3dc405ab6a79ebdc234."
		},
		{"message": "Fix main width"},
		{"message": "Fix styling for kbd elements"},
		{"message": "Update common.css"}
	],
	"Quench": [{"message": "Remove .gitkeep from node_modules"}],
	"smotaal.io": [
		{"message": "Update .gitignore"},
		{
			"message": "Add experimental markout/styles/preload.js - with ./alpha ./beta entry points"
		},
		{"message": "Add browser/dynamicImport.js"}
	],
	"conres.app": [
		{"message": "Create CNAME"},
		{"message": "Delete CNAME"},
		{"message": "Create CNAME"},
		{"message": "Initial commit"}
	]
}`)))

*/
