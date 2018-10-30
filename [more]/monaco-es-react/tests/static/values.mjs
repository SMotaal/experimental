export const zeroes = (value, length) =>
  `${value || '0'}`.padStart((length > 0 && length) || 0, '0');

export const time = {
  toString: (time = new Date()) =>
    `${time.getMinutes()}:${zeroes(time.getSeconds(), 2)}.${zeroes(time.getMilliseconds(), 3)}`,
};

//  @import "${styles.href}";

// <style>
//   @import "${styles.href}";
//   .fill { background-color: var(--fill, #F006); }

//   .content::after { content: ' '; }
//   :host(.viewable) .content::after { content: attr(data-text); }

//   :host > * { --text: transparent; }
//   :host(.viewable) > * { --text: orange; }

//   * {
//     color: var(--text, currentcolor);
//     transition: color 0.5s, background 0.5s;
//   }
// </style>
// <style src="${styles.href}"></style>
// <style src="${{toString: () => styles.href}}" type="text/css"></style>



// (async () => {
//   const url = await styles.cache;
//   await new Promise(resolve => setTimeout(resolve, 5000));
//   const response = await fetch(url);
// })()
