GLOBALS: {
  const replicates = (
    location.hash && parseInt(location.hash.slice(1))
  ) || 10;

  const select = (selector, parent = document) =>
    (parent &&
      'querySelector' in parent &&
      (selector = `${selector || ''}`.trim()) &&
      parent.querySelector(selector)) ||
    undefined;

  const selectAll = (selector, parent = document) =>
    (parent &&
      'querySelectorAll' in parent &&
      (selector = `${selector || ''}`.trim()) &&
      parent.querySelectorAll(selector)) ||
    undefined;

  const rendered = () => new Promise(requestAnimationFrame);

  const timelined = (label, ƒ) => {
    let result;
    try {
      console.time(label);
      return result = ƒ();
    } finally {
      result && result.then && result.then(() => console.timeEnd(label)) || console.timeEnd(label);
    }
  }

  const idle =
    typeof requestIdleCallback === 'function' ? requestIdleCallback : ƒ => setTimeout(ƒ, 100);
  const idled = () => new Promise(idle);
  const timeout = timeout => new Promise(resolve => setTimeout(resolve, timeout));

  Object.defineProperties(self, {
    replicates: { value: replicates, writable: false },
    select: { value: select, writable: false },
    selectAll: { value: selectAll, writable: false },
    idle: { value: idle, writable: false },
    timeout: { value: timeout, writable: false },
    timelined: { value: timelined, writable: false },
    idled: { get: idled },
    rendered: { get: rendered },
  });
}
