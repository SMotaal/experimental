/**
 * SEE: https://github.com/GoogleChromeLabs/wasm-feature-detect
 * Derived from: https://unpkg.com/wasm-feature-detect?module
 */
export const wasmFeatureDetect = (() => {
  const checks = {};
  checks['big_int'] = async () => {
    try {
      const a = BigInt(0);
      return (
        (
          await WebAssembly.instantiate(
            /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 1, 126, 1, 126, 3, 2, 1, 0, 7, 5, 1, 1, 98, 0, 0, 10, 6, 1, 4, 0, 32, 0, 11]),
          )
        ).instance.exports
          // @ts-ignore
          .b(a) === a
      );
    } catch (exception) {
      return !1;
    }
  };

  checks['bulk_memory'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 3, 1, 0, 1, 12, 1, 0, 10, 14, 1, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11]),
    );

  checks['exceptions'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 9, 1, 7, 0, 6, 64, 7, 26, 11, 11]),
    );

  checks['multi_value'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 0, 2, 127, 127, 3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 0, 65, 0, 11]),
    );

  checks['mutable_globals'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 2, 8, 1, 1, 97, 1, 98, 3, 127, 1, 6, 6, 1, 127, 1, 65, 0, 11, 7, 5, 1, 1, 97, 3, 1]),
    );

  checks['reference_types'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 6, 1, 4, 0, 208, 26, 11]),
    );

  checks['sat_float_to_int'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 12, 1, 10, 0, 67, 0, 0, 0, 0, 252, 0, 26, 11]),
    );

  checks['sign_extension'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 0, 192, 26, 11]),
    );

  checks['simd'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 9, 1, 7, 0, 65, 0, 253, 4, 26, 11]),
    );

  checks['tail_call'] = async () =>
    WebAssembly.validate(
      /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 6, 1, 4, 0, 18, 0, 11]),
    );

  checks['threads'] = async () => {
    if (
      !WebAssembly.validate(
        /*prettier-ignore*/ new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11]),
      )
    )
      return !1;
    try {
      return new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), !0;
    } catch (exception) {
      return !1;
    }
  };

  return checks;
})();
