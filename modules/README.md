# Module (_Experimental_)

Runtime-strapped Module subsystem.

## Scope

**What it aims to accomplish**

- Provide a way to model module loading problems and features.
- Provide a way to load modules regardless of platform capabilities.
- Provide a new castable module syntax designed for [ESM/x](./ESX.md) parity.

**What it does not try to do**

- Replace ESM or any other module format.

# Experiments — work in progress

Too early but feel free to inspect the console for now.

## Browser

> _[./modules.html](./modules.html)_
>
> in Chrome, Safari, Firefox


> _[JSBin (v5 only)](https://jsbin.com/gist/ca92f577fe1be4ff8f4feb4a41062785?result=console)_
>
> in Chrome, Safari, Firefox


## Node.js


> `> index.mjs`
>
> with `--experimental-modules`


> `> index.js`
>
> without `--experimental-modules`
