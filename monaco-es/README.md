# Monaco ES (*Experimental*)

**Live Demo**

*TypeScript*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#ts

<details><summary>Other Modes</summary>

*HTML*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#html

*CSS*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#css

*JSON*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#json

*Bat*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#bat

*Coffee*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#coffee

*C++*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#cpp

*C#*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#csharp

*CSP*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#csp

*Dockerfile*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#dockerfile

*F#*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#fsharp

*GO*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#go

*Handlebars*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#handlebars

*INI*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#ini

*Java*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#java

*LESS*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#less

*Lua*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#lua

*Markdown*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#markdown

*Msdax*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#msdax

*MySQL*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#mysql

*Objective-C*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#objective-c

*PgSQL*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#pgsql

*PHP*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#php

*Postiats*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#postiats

*PowerShell*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#powershell

*Pug*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#pug

*Python*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#python

*R*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#r

*Razor*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#razor

*Redis*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#redis

*Redshift*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#redshift

*Ruby*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#ruby

*Rust*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#rust

*SB*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#sb

*SCSS*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#scss

*Solidity*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#solidity

*SQL*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#sql

*ST*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#st

*Swift*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#swift

*Visual Basic*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#vb

*XML*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#xml

*YAML*
> https://smotaal.github.io/experimental/monaco-es/static/monaco-es.html#yaml

</details>


**Monaco ES**

You can check out the [Monaco ES](github.com/SMotaal/monaco-es) repository used to publish [`monaco-es`](https://www.npmjs.com/package/monaco-es) on NPM. Please note that files used here may diverge with experimental code.

---

**Notes**

Custom Rollup plugins were needed to mitigate non-compliance — including [#949](https://github.com/Microsoft/monaco-editor/issues/949)
> 1. Rollup was only used to make genuine ES modules from the `/esm/…` modules

Custom runtime — Some effort was needed to rewire modules at runtime
> 1. Monaco's current loading mechanisms were not enough

Not future-proofed — upgrading monaco et al may tweaks to custom plugins
> 1. Invalid top-level `this` references are usual culprits
> 2. Refactored monaco module paths may not match those in Rollup config

Proof-of-concept only — not optimized… not efficient… "it just proofs that it works"
> 1. ES modules are sometimes not stable — "may crash" (currently affects Chrome at least)
> 2. Requires dynamic imports — did not polyfill (currently affects Firefox & Edge)
> 3. Require ES modules in worker — can't polyfill (currently affects Safari at least)
