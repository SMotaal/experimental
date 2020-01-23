# Experimental Ghostscript

Ghostscript experiments!

## Findings

- Needs to be modularized and decoupled
- Ghostscript's build system is poorly documented

## Use Cases

### Interpreting and serving in workers

We will need to modularize features behind lower-level APIs matching with the [`gsapi`](https://www.ghostscript.com/doc/current/API.htm).

#### Input

We need to operate uncompressed UTF8 buffers — ie decouple from all matters of compression, encodings, asynchronous loading... etc.

- **`👍` Tokenization** (`PostScript` and `PDF` buffers)

- **`👍` Indexing** (linked or embedded assets)

  > **`👎` Asset Decoding**
  >
  > Only if they do not involve deeply-nested or dead-weight dependencies, like [jbig2dec](https://jbig2dec.com/).

**Processing**

We need to operate on reify objects, create objects in place of executable code, and perform static transformations — ie vector remains vector, raster remains raster, text remains text… etc.

- **`👍` Interpretation** (`PostScript` code)

  > **`👋` Interfacing** (`file`, `device` and `system` operations)
  >
  > As long as they can be performed synchronously, which is well suited for `stdout` and `stderr`.
  >
  > Additional abstractions will be required to work directly with linked assets which likely need asynchronous preloading between prior to processing.

- **`👍` Transformation** (objects and assets)

  > **`👋` Color Conversions**
  >
  > As long as they do not require asset decoding.

  > **`👎` Flattening and Rasterization**
  >
  > Only if they do not involve text rendering and operating on assets… etc.

**Output**

We need to operate on writable streams which are suited for offline printing or client-side rendering — ie decouple from compression and target-dependent operations, where for instance it is best to defer to the client how it needs to go about converting color from `CMYK` to `RGB` as is likely to mitigate `SVG` limitations in most browsers.

- **`👍` Serialization**  (`PostScript`, `PDF` and `SVG`)
