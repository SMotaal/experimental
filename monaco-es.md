# Monaco ES (*Experimental*)

Today I decided to take a couple of hours to strip out my (~3 months old) `monaco-es` aspect from the old project and gave it the first "live" test here: https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html

This experiment is a little different than my latest version (0.0.6) of the published npm module `monaco-es` itself, but I thought a (rather ugly but) working proof of concept for those who are interested in pushing this idea forward.

<details><summary>Modes

> Simply append `#mode` to reload in new mode

- TypeScript: https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#ts

</summary>

- HTML
   > https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#html

- CSS
   > https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#css

- JSON
   > https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#json

- Basic Modes (same idea as above)
   > … #bat #bat #coffee #cpp #csharp #csp #dockerfile #fsharp #go #handlebars #ini #java #less #lua #markdown #msdax #mysql #objective-c #pgsql #php #postiats #powershell #pug #python #r #razor #redis #redshift #ruby #rust #sb #scss #solidity #sql #st #swift #ts #vb #xml #yaml

</details>

<details><summary>Notes

- Custom Rollup plugins were needed to mitigate non-compliance — including [#949](https://github.com/Microsoft/monaco-editor/issues/949)
   > 1. Rollup was only used to make genuine ES modules from the `/esm/…` modules

</summary>

- Custom runtime — Some effort was needed to rewire modules at runtime
   > 1. Monaco's current loading mechanisms were not enough

- Not future-proofed — upgrading monaco et al may tweaks to custom plugins
   > 1. Invalid top-level `this` references are usual culprits
   > 2. Refactored monaco module paths may not match those in Rollup config

- Proof-of-concept only — not optimized… not efficient… "it just proofs that it works"
   > 1. ES modules are sometimes not stable — "may crash" (currently affects Chrome at least)
   > 2. Requires dynamic imports — did not polyfill (currently affects Firefox & Edge)

</details>
