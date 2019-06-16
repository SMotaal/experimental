# STRUCTS <sub><sup>`v0`</sup></sub>

## Preface

STRUCTS — also Structs[<sup>⑴</sup>](#identity-and-naming-expectations 'Identity and Naming Expectations') — is a new text-based declarative data format for expressing autonomously structured data using _Simple To Read Unambiguously Consumable Text Structures_ notation that is logically sound from a parsing standpoint and visually intuitive for easy reading.

### Variants and Versioning Convention

This document is a variant of a preliminary specifications which:

1. Initially `v0` — the non-formal specification document for/of limited experimentation.

2. Subsequently `v0.𝑛` — the initial working draft(s) for prospective `v𝑛` formal specification(s).

### Roadmap

- [ ] STRUCTS `v0` — Non-formal Specification Document

  - [ ] Create `v0` draft

    - [x] Preface — Variants and Versioning Conventions
    - [ ] Preface — Structure and Notations Conventions

  - [ ] Publish `v0` draft
    - [x] Specification — "Identity and Naming Expectations"
    - [ ] Determine "public domain" licensing
    - [ ] Register MIME type(s)

- [ ] STRUCTS `v0.1` — Working Draft Specification Document

---

## Specification

### Identity and Naming Expectations

In this document, the acronym STRUCTS and the noun Struct (plural Structs) all refer to different facets of the same language, where:

1. The former may be used when referring to the actual specification or the underlying notational principles.

2. The latter is the official identifiable name used in:

   a) plural form to refer to the language itself — ie Structs.

   b) either forms for exclusive manifestations — eg Struct document(s), `text/structs` the mime type, or `Structs.parse()` the API method.

   c) prefix form for non-exclusive manifestations — eg `let structDocument = class StuctDocument extends StructNode {}`.
