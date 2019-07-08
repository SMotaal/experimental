# `content.smotaal.io` <small><br/>aka `smotaal.io/content`</small>

Service Worker optimized delivery for content.

## Motivation

Aside from its unique locator and destination, and the fact that it will potentially load, all aspects of any content are neither set in stone nor considered optimal for any and all receivers.

Service Workers can play an important role in the optimization of content. They can downstream a lot of the tasks that historically lived in backends, which often required them to first interrogate the receiver in order to perform optimizations as needed.

Downstream optimization makes a lot more sense, and furthermore, makes it possible to reduce or even eliminate the need for backends beyond content and APIs.

## Experimental Work

### `sandbox-frame` <small>[<kbd>Meta</kbd>][sandbox-frame-meta]</small>

- [remapping][sandbox-frame-remapping-experiment]
- [routing][sandbox-frame-rerouting-experiment]

[sandbox-frame-meta]: /meta/@ses/Sandbox-Frame.md
[sandbox-frame-remapping-experiment]: /sandbox/experiments/service-workers/remapping/index.html
[sandbox-frame-rerouting-experiment]: /sandbox/experiments/service-workers/rerouting/index.html

### Service Worklets
