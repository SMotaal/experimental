export default (() => {
  const TypedArray = Object.getPrototypeOf(Int8Array);

  const TypedArrayClasses = {
    Int8Array,
    Uint8ClampedArray,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    BigInt64Array: (typeof BigInt64Array === 'function' && BigInt64Array) || undefined,
    BigUint64Array: (typeof BigUint64Array === 'function' && BigUint64Array) || undefined,
  };

  Object.setPrototypeOf(TypedArrayClasses, new Set(Object.values(TypedArrayClasses).filter(Boolean)));

  const ResponseClasses = {
    String,
    DataView,
    ArrayBuffer,
    Response: (typeof Response === 'function' && Response) || undefined,
    Blob: (typeof Blob === 'function' && Blob) || undefined,
    FormData: (typeof FormData === 'function' && FormData) || undefined,
    ReadableStream: (typeof ReadableStream === 'function' && ReadableStream) || undefined,
    URLSearchParams: (typeof URLSearchParams === 'function' && URLSearchParams) || undefined,
    ...TypedArrayClasses,
    TypedArray,
  };

  Object.setPrototypeOf(ResponseClasses, new Set(Object.values(ResponseClasses).filter(Boolean)));

  const responseType = response =>
    (response &&
      typeof response === 'object' &&
      ((typeof response.slice === 'function' &&
        ((response.length >= 0 && response instanceof String && String) ||
          (response.byteLength >= 0 &&
            ((response instanceof TypedArray && TypedArray) ||
              (response instanceof DataView && DataView) ||
              (response instanceof ArrayBuffer && ArrayBuffer))) ||
          (ResponseClasses.Blob && response instanceof Blob && Blob))) ||
        (ResponseClasses.ReadableStream && response instanceof ReadableStream && ReadableStream) ||
        (ResponseClasses.FormData && response instanceof FormData && FormData) ||
        (ResponseClasses.URLSearchParams &&
          response instanceof URLSearchParams &&
          URLSearchParams))) ||
    undefined;

  const typedArrayType = array =>
    (array &&
      array.buffer &&
      array instanceof TypedArray &&
      ((array.BYTES_PER_ELEMENT === 1 &&
        ((array instanceof Int8Array && Int8Array) ||
          (array instanceof Uint8ClampedArray && Uint8ClampedArray) ||
          (array instanceof Uint8Array && Uint8Array))) ||
        (array.BYTES_PER_ELEMENT === 2 &&
          ((array instanceof Int16Array && Int16Array) ||
            (array instanceof Uint16Array && Uint16Array))) ||
        (array.BYTES_PER_ELEMENT === 4 &&
          ((array instanceof Int32Array && Int32Array) ||
            (array instanceof Uint32Array && Uint32Array) ||
            (array instanceof Float32Array && Float32Array))) ||
        (array.BYTES_PER_ELEMENT === 8 &&
          ((array instanceof Float64Array && Float64Array) ||
            (TypedArrays.BigInt64Array && array instanceof BigInt64Array && BigInt64Array)(
              TypedArrays.BigUint64Array && array instanceof BigUint64Array && BigUint64Array,
            ))) ||
        TypedArray)) ||
    undefined;

  const iterableType = iterable =>
    (iterable &&
      (iterable.length >= 0 &&
        ((iterable.normalize && iterable instanceof String && String) ||
          (Array.isArray(iterable) && Array)))) ||
    ((iterable[Symbol.iterator] &&
      ('add' in iterable &&
        'has' in iterable &&
        ((iterable.size >= 0 &&
          ((iterable instanceof Map && Map) || (iterable instanceof Set && Set))) ||
          ((iterable instanceof WeakMap && WeakMap) ||
            (iterable instanceof WeakSet && WeakSet))))) ||
      (iterable instanceof TypedArray && TypedArray)) ||
    undefined;

  const cachable = (data = '', type) => {
    if (data === null) return {data: null, type: ''};
    if (typeof data === 'object') {
      const prototype = Object.getPrototypeOf(data);

      const ResponseClass =
        prototype && prototype !== Object.prototype && responseType(prototype);

      if (!ResponseClass) {
        type ||
          (type =
            (ResponseClass === String && 'text/plain') ||
            (ResponseClass === ResponseClasses.FormData && 'multipart/form-data')(
              ResponseClass === ResponseClasses.URLSearchParams &&
                'application/x-www-form-urlencoded',
            )(ResponseClass === ResponseClasses.Blob && data.type) ||
            'application/octet-stream');
      } else {
        data = JSON.stringify(data);
        type || (type = 'application/json');
      }
    } else {
      const dataType = typeof data;
      if (dataType !== 'string') {
        if (dataType === 'function' || dataType === 'symbol')
          throw TypeError(`Serialize was called on a ${dataType} value!`);
        data = JSON.stringify(data);
        type || (type = 'application/json');
      }
      type || (type = 'text/plain');
    }

    return {data, type};
  };

  Object.assign(cachable, {
    iterableType,
    responseType,
    TypedArray,
    ResponseClasses,
    TypedArrayClasses
  });

  return cachable;
})();
