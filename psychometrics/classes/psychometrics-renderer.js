export class PsychometricsRenderer {
  render({form, mappings, definitions, id = definitions.id || 'psychometrics', classes = this.empty}) {
    this.id = id;
    this.mappings = mappings;
    this.definitions = definitions;
    this.classes = {};
    this.classes.prefix = classes.prefix || 'psychometrics';

    {
      const {prefix} = this.classes;
      const prefixRegExp = new RegExp(String.raw`^${prefix}-|^`);
      for (const classname of [
        'items',
        'item',
        'item-number',
        'item-separator',
        'item-prompt',
        'options',
        'option',
        'option-radio',
        'option-label',
        'results',
        'score-button',
        'incomplete-notice',
        'score-card',
        'score',
        'score-label',
        'score-separator',
        'score-value',
      ])
        this.classes[classname] = prefixRegExp[Symbol.replace](classes[classname] || classname, `${prefix}-`);
    }

    this.form = form;
    this.lastItem = this.lastScore = this.lastOption = undefined;
    this.form.innerHTML = this.renderForm();
  }

  renderForm() {
    return /* html */ `
      <div class="${this.classes['items']}">
        ${this.definitions.items.map(this.renderItem, this).join('\n')}
      </div>
      <div class="${this.classes['results']}">
        <p><button class="${this.classes['score-button']}" type=submit>Score</button></p>
        <p><span class="${this.classes['incomplete-notice']}" id=score-incomplete hidden>Incomplete</span></p>
        <div class="${this.classes['score-card']}" id=score-card hidden>
          ${[
            this.mappings.totalColumn,
            ...(this.definitions.subscales !== null && typeof this.definitions.subscales === 'object'
              ? Object.keys(this.definitions.subscales)
              : this.empty),
          ]
            .map(this.renderScore, this)
            .join('\n')}
        </div>
      </div>
    `;
  }

  renderItem(item) {
    this.lastItem = item;
    return /* html */ `
      <h6 class="${this.classes['item']}">
        <span class="${this.classes['item-number']}">${item.number}<span class="${
      this.classes['item-separator']
    }">.</span></span>
        <span class="${this.classes['item-prompt']}">${item.prompt}</span>
      </h6>
      <ol class="${this.classes['options']}" type="a" role="radiogroup" aria-label="${item.prompt}">
        ${this.definitions.options.map(this.renderOption, this).join('\n')}
      </ol>
    `;
  }

  renderOption(option) {
    this.lastOption = option;
    const name = this.lastItem.id || `${this.id}${this.mappings.idSeparator}${this.lastItem.number}`;
    return /* html */ `
      <li class="${this.classes['option']}">
        <input class="${this.classes['option-radio']}" id="${name}" name="${name}" type="radio" value="${option}">
        <label class="${this.classes['option-label']}" for="${name}">
          ${option}</label>
      </li>
    `;
  }

  renderScore(score) {
    this.lastScore = score;
    return /* html */ `
      <p class="${this.classes['score']}">
      <span class="${this.classes['score-label']}">${
      score === this.mappings.totalColumn
        ? this.definitions.psychometric || 'Score'
        : (this.definitions.subscales &&
            this.definitions.subscales[score] &&
            (this.definitions.subscales[score].description || this.definitions.subscales[score].subscale)) ||
          `${score}`
    }<span class="${this.classes['score-separator']}">:</span></span>
      <output class="${this.classes['score-value']}" id="${this.id}${this.mappings.idSeparator}${
      this.mappings.totalRow
    }${this.mappings.idSeparator}${score}"></output>
      </p>
    `;
  }

  static render(options) {
    return new this().render(options);
  }
}

PsychometricsRenderer.prototype.empty = Object.freeze(/** @type {{} & Iterable<void>} */ ([]));
