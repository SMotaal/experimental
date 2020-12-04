export class PsychometricsRenderer {
  render({form, mappings, definitions, id = definitions.id || 'psychometrics'}) {
    this.id = id;
    this.mappings = mappings;
    this.definitions = definitions;
    this.form = form;
    this.lastItem = this.lastScore = this.lastOption = undefined;
    this.form.innerHTML = this.renderForm();
  }

  renderForm() {
    return /* html */ `
      ${this.definitions.items.map(this.renderItem, this).join('\n')}
      <div class=test-results>
        <p><button type=submit>Score</button></p>
        <p><span id=score-incomplete hidden>Incomplete</span></p>
        <div id=score-card hidden>
          ${[this.mappings.totalColumn, ...(Object.keys(this.definitions.subscales) || '')]
            .map(this.renderScore, this)
            .join('\n')}
        </div>
      </div>
    `;
  }

  renderItem(item) {
    this.lastItem = item;
    return /* html */ `
      <h6>${item.number}. ${item.prompt}</h6>
      <ol role="radiogroup" aria-label="${item.prompt}">
        ${this.definitions.options.map(this.renderOption, this).join('\n')}
      </ol>
    `;
  }

  renderOption(option) {
    this.lastOption = option;
    return /* html */ `
      <li><label><input name="${
        this.lastItem.id || `${this.id}${this.mappings.idSeparator}${this.lastItem.number}`
      }" type="radio" value="${option}">${option}</label></li>
    `;
  }

  renderScore(score) {
    this.lastScore = score;
    return /* html */ `
      <p>${
        score === this.mappings.totalColumn
          ? this.definitions.psychometric || 'Score'
          : (this.definitions.subscales &&
              this.definitions.subscales[score] &&
              this.definitions.subscales[score].description) ||
            `${score}`
      }: <output id="${this.id}${this.mappings.idSeparator}${this.mappings.totalRow}${
      this.mappings.idSeparator
    }${score}"></output></p>
    `;
  }

  static render(options) {
    return new this().render(options);
  }
}
