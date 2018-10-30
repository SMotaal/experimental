{
  const log = event => console.log('%c🅴 %s', 'color: steelblue', event.type, event);

  const defaults = {
    handler: log,
    filter: /click|wheel|scroll|on(?:drag|drop|key|mouse|pointer|touch)/,
    options: {passive: true},
  };

  const attach = (target, {handler, filter, options} = defaults) => {
    if (handler && target)
      for (const property in target)
        !property.startsWith('on') ||
          filter.test(property) ||
          target.addEventListener(property.slice(2), handler, options);
  };

  attach(document);
}
