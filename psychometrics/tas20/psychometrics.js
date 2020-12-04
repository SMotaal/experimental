//@ts-check

const options = (async () => {
  const [id, definitions] = Object.entries(
    Object.values(JSON.parse(await (await fetch('./psychometrics.json')).text()))[0],
  )[0];
  const mappings = Object.freeze({
    idSeparator: ':',
    totalRow: 'total',
    totalColumn: 'score',
    columnIds: Object.freeze(
      Object.fromEntries(
        ['score', ...(definitions.subscales ? Object.keys(definitions.subscales) : [])].map(column => [
          column,
          `${column}`,
        ]),
      ),
    ),
    rowIds: Object.freeze(
      Object.fromEntries(
        [
          'total',
          ...Array(definitions.items.length)
            .fill(undefined)
            .map((v, i) => `${1 + i}`),
        ].map(row => [row, `psychometrics:${id}:${row}`]),
      ),
    ),
  });
  return Object.freeze({definitions, mappings});
})();

/** @param {HTMLFormElement} form */
export const renderForm = async form => {
  const {PsychometricsRenderer} = await import('../classes/psychometrics-renderer.js');

  PsychometricsRenderer.render({form, ...(await options)});
};

/** @param {HTMLFormElement} form */
export const scoreForm = async form => {
  const {PsychometricsResults} = await import('../classes/psychometrics-results.js');
  const results = new PsychometricsResults(form, await options);
  const {
    mappings: {totalRow = 'total'},
    scores: {
      [totalRow]: {missed},
    },
  } = results;
  console.log(results);
  const scoreIncomplete = form.querySelector('#score-incomplete');
  const scoreCard = form.querySelector('#score-card');
  scoreIncomplete && (scoreIncomplete.hidden = !(missed > 0));
  scoreCard && (scoreCard.hidden = missed > 0);
};
