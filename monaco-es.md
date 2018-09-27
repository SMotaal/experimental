# Monaco ES (*Experimental*)

**IMPORTANT**: The files used in this experiment may differ from the published [`monaco-es`](https://www.npmjs.com/package/monaco-es) package.

**Notes**
  
- Custom Rollup plugins were needed to mitigate non-compliance — including [#949](https://github.com/Microsoft/monaco-editor/issues/949)
   > 1. Rollup was only used to make genuine ES modules from the `/esm/…` modules

- Custom runtime — Some effort was needed to rewire modules at runtime
   > 1. Monaco's current loading mechanisms were not enough

- Not future-proofed — upgrading monaco et al may tweaks to custom plugins
   > 1. Invalid top-level `this` references are usual culprits
   > 2. Refactored monaco module paths may not match those in Rollup config

- Proof-of-concept only — not optimized… not efficient… "it just proofs that it works"
   > 1. ES modules are sometimes not stable — "may crash" (currently affects Chrome at least)
   > 2. Requires dynamic imports — did not polyfill (currently affects Firefox & Edge)
   > 3. Require ES modules in worker — can't polyfill (currently affects Safari at least)


## Live Demo

Simply replace `#ts` to switch modes.

<details><summary>https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#ts …</summary>

- TypeScript
   > https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#ts

- HTML
   > https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#html

- CSS
   > https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#css

- JSON
   > https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#json

- Basic Modes (same idea as above)
   > … #bat #bat #coffee #cpp #csharp #csp #dockerfile #fsharp #go #handlebars #ini #java #less #lua #markdown #msdax #mysql #objective-c #pgsql #php #postiats #powershell #pug #python #r #razor #redis #redshift #ruby #rust #sb #scss #solidity #sql #st #swift #ts #vb #xml #yaml

</details>
