# Sandbox

Experimental sandbox runtimes.


## Resources

<table><tr><td>

### Entry Points

The starting point of any Sandbox runtime is the entry point. It can be either a `document` or a `module` resource.

</td></tr><tr><td>

### Documents


#### HTML Documents

</td></tr><tr><td>

### Modules

Modules which are technically asset resources, are considered separately due to the special resolution and loading semantics and behaviours they require.

#### ECMAScript Modules

#### Custom Modules

</td></tr><tr><td>

### Assets

Content originating from a unique file source (concerete or implied) is normally considered assets.

In fact, both Documents and Modules are technically asset resources. However, due to their highly specialized resolution and loading complexities which often requires additional knowledge of other resources, they cannot be categorized as assets.

Criteria for assets include:

- Independently resolved and loaded by a referrer
- References to external dependencies:
  - either declaratively scoped or unscoped

#### ECMAScript Scripts

#### CSS Stylesheets

#### JSON Manifests

</td></tr><tr><td>

### Data

#### Fetch and XHR

#### WebSocket

#### Event Stream

</td></tr></table>


## References

- [Safe JavaScript Modules](https://docs.google.com/document/d/1pPiu3cjBT5OqEgqtsdDJcW5g1QsgmxvIHQjdkrPej3U/ "Safe JavaScript Modules — Written by Mark S. Miller, Darya Melicher, Kate Sills, and JF Paradis")
