import {PsychometricsRenderer} from '../classes/psychometrics-renderer.js';
import {PsychometricsResults} from '../classes/psychometrics-results.js';

export const initializeForm = (form, options) => {
  if (!form) form = document.createElement('form');

  options = initializeSource({
    source: './psychometrics.json',
    baseURI: form.baseURI,
    ...(typeof options === 'string' ? {source: options} : options),
  });

  form.addEventListener(
    'submit',
    event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      whenReady(scoreForm, form, options);
      return false;
    },
    true,
  );

  whenReady(renderForm, form, options);
};

export const whenReady = async (callback, ...args) => {
  [callback, ...args] = await Promise.all([callback, ...args]);
  return callback(...args);
};

/** @param {HTMLFormElement} form */
export const scoreForm = (form, options) => {
  const results = new PsychometricsResults(form, options);
  const incomplete = Object.values(results.weights).includes(NaN);
  console.log(results);
  const scoreIncomplete = form.querySelector('#score-incomplete');
  const scoreCard = form.querySelector('#score-card');
  scoreIncomplete && (scoreIncomplete.hidden = !incomplete);
  scoreCard && (scoreCard.hidden = incomplete);
};

export const renderForm = (form, options) => {
  PsychometricsRenderer.render({form, ...options});
  return form;
};

export const initializeSource = async options => {
  let parentID;
  [parentID, options.definitions] = Object.entries(
    Object.values(
      JSON.parse(
        await (
          await fetch(
            (options.source = `${new URL(
              options.source,
              options.baseURI !== undefined ? options.baseURI : (options.baseURI = import.meta.url),
            )}`),
          )
        ).text(),
      ),
    )[0],
  )[0];

  options.mappings = Object.freeze({
    idSeparator: ':',
    totalRow: 'total',
    totalColumn: 'score',
    columnIds: Object.freeze(
      Object.fromEntries(
        ['score', ...(options.definitions.subscales ? Object.keys(options.definitions.subscales) : [])].map(column => [
          column,
          `${column}`,
        ]),
      ),
    ),
    rowIds: Object.freeze(
      Object.fromEntries(
        [
          'total',
          ...Array(options.definitions.items.length)
            .fill(undefined)
            .map((v, i) => `${1 + i}`),
        ].map(row => [row, `psychometrics:${parentID}:${row}`]),
      ),
    ),
  });

  return options;
  // return Object.freeze({definitions: options.definitions, mappings: options.mappings});
};
