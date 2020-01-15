# experimental-wasm

Experimental WebAssembly things!

## Getting Started

### Pulling Subtrees

> See [`subtree:pull`][]

```js
yarn subtree:pull bytecodealliance/wasmtime gh-pages;
yarn subtree:pull emscripten-core/emsdk;
yarn subtree:pull freestrings/rust-wasm-regex;
```

[`subtree:pull`]: ./tasks/git/subtree/README.md#pull

### Resetting forked `origin` from `upstream`

> See https://stackoverflow.com/a/42332860/12127490

```sh
# ensures current branch is master
git checkout master

# pulls all new commits made to upstream/master
git pull upstream master

# this will delete all your local changes to master
git reset --hard upstream/master

# take care, this will delete all your changes on your forked master
git push origin master --force
```

## References

- https://github.com/ArtifexSoftware/thirdparty-lcms2
- https://www.npmjs.com/search?q=ghostscript
- https://github.com/flash1293/aes-wasm#readme
- https://dev.to/giteden/4-git-submodules-alternatives-you-should-know-1hga
- https://github.com/shiftyp/submodule-gh-pages-example
- https://github.github.com/training-kit/downloads/github-git-cheat-sheet.pdf
- https://hub.github.com/hub.1.html
- https://webassembly.org/getting-started/developers-guide/
- https://github.com/dubzzz/fast-check
