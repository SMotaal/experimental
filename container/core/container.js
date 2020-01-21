// @ts-check

class Container {
  /** @param {Container.Options} options */
  constructor(options) {
    ({origin: this.origin, context: this.context, evaluate: this.evaluate, type: this.type} = {
      ...new.target.defaults,
      ...options,
    });
  }

  // static get defaults() {
  //   return /** @type {this['prototype']} */ ({
  //     ...this.prototype,
  //     // @ts-ignore
  //     ...super.defaults,
  //   });
  // }
}

Container.prototype.origin = /** @type {string} */ (undefined);
Container.prototype.context = /** @type {{}} */ (undefined);
Container.prototype.evaluate = /** @type {(code: string) => Promise<undefined>} */ (undefined);
Container.prototype.type = /** @type {string} */ (undefined);

Object.freeze(Container.prototype);

Container.defaults = Object.freeze({
  origin: Container.prototype.origin,
  context: Container.prototype.context,
  evaluate: Container.prototype.evaluate,
  type: Container.prototype.type,
});

Object.defineProperties(
  Container.prototype,
  (({constructor, ...descriptors}) => descriptors)(
    Object.getOwnPropertyDescriptors(Object.freeze({...Container.prototype})),
  ),
);

/** @typedef {Partial<(typeof Container)['defaults']>} Container.Options */
/** @typedef {Container.Options['context']} Container.Context */

export {Container};
