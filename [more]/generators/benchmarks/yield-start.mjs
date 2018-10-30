//# Benchmark: `yield*` vs `reiterate()`
(function () {
function* yields(...generators) {
  for (const generator of generators) {
    yield* generator;
  }
}

function* iterates(...iteratives) {
  for (const iterative of iteratives) {
    const iterator =
      ('next' in iterative && typeof iterative.next === 'function' && iterative) ||
      iterative[Symbol.iterator]();
    let done, result;
    while (!(result = iterator.next()).done) {
      yield result.value;
    }
  }
}

function* generates(i = ++generates.instance || (generates.instance = 1), n = 10) {
  for (let j = 0; n-- >= 0; j++) yield `${i}:${j}`;
}

function aggregates(from = yields, n = 3) {
  let depth = 0;
  let series = from(generates(depth++));
  while (n-- >= 0) series = from(series, generates(depth++));
  return series;
}

const tests = {
  //## `yield*`
  ['yield*']() {
    const series = aggregates(yields);
    const values = [...series];
    return values;
    // console.log(values);
  },

  //## `reiterate()`
  ['reiterate()']() {
    const series = aggregates(iterates);
    const values = [...series];
    return values;
    // console.log(values);
  },
};

for (const test in tests) {
  console.group(test);
  let values = [...tests[test]()];
  for (let q = 100; q--; ) values = [...tests[test]()];
  console.log(...values);
  console.time(test);
  for (let p = 100; p--; ) for (let q = 100; q--; ) values = [...tests[test]()];
  console.timeEnd(test);
  console.groupEnd();
}

})();
