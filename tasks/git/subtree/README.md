# Subtree

These tasks utilize `git subtree` to make it possible to work with content from other source repositories as nested folders which may be modified and committed directly into the target repository. This approach handles all `remote` operations locally which gives it more flexibility for forking and hosting when compared with the `git submodule` approach.

## Pull

### Usage

```
pull ‹owner›/‹repository› ‹branch?›
```

1. Adds "‹owner›/‹repository›" named remote for "https://github.com/‹owner›/‹repository›", when necessary.

2. Adds/Pulls "@‹owner›/‹repository›" prefixed "squashed" subtree of the `‹branch?›` (or `master`), as needed.

> **Examples**
>
> ```
> yarn git:subtree:pull emscripten-core/emsdk;
> yarn git:subtree:pull bytecodealliance/wasmtime gh-pages;
> ```

#### Given the specifier `org/repo` and `branch`:

1. Adds "org/repo" named remote for "https://github.com/org/repo" (if needed
2. Adds/Pulls "@org/repo" prefixed "squashed" subtree (as needed)

> **Example**
>
> ```
> # 1. Adds "org/repo" named remote for "https://github.com/org/repo" (if needed)
> # 2. Adds/Pulls "@org/repo" prefixed "squashed" subtree (as needed).
> yarn git:subtree:pull org/repo;
> ```

## References

- https://nering.dev/2016/git-submodules-vs-subtrees/
- https://git-scm.com/book/en/v2
