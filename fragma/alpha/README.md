# Fragma (_concept_)

Okay, concept means messy and probably requires flags on nightly or the likes, agreed? Just don't expect this to be more than what it is!

**Live Demos**

_throttle_ — renders <var>n</var> instances of a perpetually changing element

<blockquote>

https://smotaal.github.io/experimental/fragma/alpha/throttle#<var>n</var>

- [#100](https://smotaal.github.io/experimental/fragma/alpha/throttle#100)
- [#1000](https://smotaal.github.io/experimental/fragma/alpha/throttle#1000)
- [#2000](https://smotaal.github.io/experimental/fragma/alpha/throttle#2000) — a bit sluggish on iPhone X
- [#5000](https://smotaal.github.io/experimental/fragma/alpha/throttle#5000) — sluggish at best on iPhone X
- [#10000](https://smotaal.github.io/experimental/fragma/alpha/throttle#10000) — a bit sluggish on desktop
- [#20000](https://smotaal.github.io/experimental/fragma/alpha/throttle#20000) — sluggish at best everywhere

Changelog

- Reoptimized replication rendering (closer to intended)

</blockquote>

**Works**

<blockquote>

- _Chrome_
  <samp>Version 69.0.3497.100 (Official Build) (64-bit)</samp>
- _Firefox Nightly_
  <samp>64.0a1 (2018-10-06) (64-bit)</samp>
- _Safari_
  <samp>Version 12.0 (14606.1.36.1.9)</samp>
  Using own fallback for IntersectionObserver

</blockquote>

**Not Yet!**

<blockquote>

- _Safari Technology Preview_
  Unexpected CSS `content: attr(data-attribute)` behaviour

</blockquote>
