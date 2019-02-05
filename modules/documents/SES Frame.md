# `ses-frame`

The document tracks on going efforts for determining the set of requirements needed for an equivalent SES implemention in browsers.

## Stages

1. Devising a conceptual implementation:
   - Adherence to using ratified standards.
   - Early iterations emphasize:
     a. Inspectability
     b. Reliability
     c. Performance
     d. Cross-compatibility
     e. Utility (ie restrictions)
2. Determining platform limitations.
3. Making recommendations to respective bodies.

This work focuses on the first step.

## Conceptual Implementation

The basic idea is analyze and secure all resources going into the iframe to determine CSP policies and block everything else. Allowed requests will be analyzed and sanitized by a service worker. Other requests will fail.

### Elements

Abstract ideas for the potential set of Web Components:

- `<ses-sandbox>`

  - `<ses-host>`

    - `<ses-console>`
    - `<ses-relay>`

  - `<ses-frame>`
    - `<iframe>`

### Parser

A multi-syntax tokenizer that can work where the DOM does not, and can safely tokenize a single html and nested Style and Script tags — it is built around the notion that syntax error and malformed syntax are ultimately handled downstream by parsers or the runtime.

### Web Interfaces

A minimalistic implementation of the Request, Response and Caches interfaces (limited to put and match) to make it possible to polyfill the actual behaviours outside Window or Service Worker scopes (when not present).
