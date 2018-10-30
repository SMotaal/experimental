import ComponentA from '/static/component-a.mjs';

const replicates = (self.replicates >= 0 && self.replicates) || 10;

self.onhashchange || (self.onhashchange = ({newURL}) => /#\d/.test(newURL) && location.reload());

replicate('component-a', ComponentA, select('template#components'), replicates);

async function replicate(tagName, Component, template, replicates) {
  const title = document.title;
  const label = `Initializing ${tagName} × ${replicates}`;

  console.group(label), console.time(label);

  let initialized, parent, element;
  const promises = new Set();
  const errors = [];
  const promise = promise => (promises.add(promise), promise);
  const error = error => (error.push(error), error);

  try {
    element = select(tagName, (template && template.content) || document);

    await idled;
    await rendered;

    if (element && replicates) {
      promise(
        timelined(`Replicating ${tagName} × ${replicates}`, async () => {
          for (let n = replicates; --n; element.after((element = element.cloneNode(true))))
            n % 100 || (await rendered), n % 1000 || (await timeout(100));
        }),
      );
    }

    await rendered;

    await promise(
      timelined(
        `Defining ${tagName}`,
        () => (Component.define(), customElements.whenDefined(tagName)),
      ),
    );

    await rendered;

    template &&
      promise(
        timelined(`Rendering ${tagName} × ${replicates}`, () => template.before(template.content)),
      );

    const elements = selectAll(tagName);

    let n = 0;
    for (const element of selectAll(tagName)) {
      n++ % 500 || (await rendered);
      promise(element.initialized);
    }
  } finally {
    initialized = await Promise.all(promises).catch(error);
    errors.length && console.warn(...errors);
    console.timeEnd(label), console.groupEnd();
  }

  // template && template.remove();
  element && element.parentElement && (document.title = `√ ${element.parentElement.querySelectorAll(tagName).length} × ${tagName}`);

  // setTimeout(() => document.title = title, 5000);
  return true;
}
