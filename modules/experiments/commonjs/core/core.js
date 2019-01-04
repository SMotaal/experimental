import {setProperty, freeze} from '../helpers.js';
import {Internal} from './internal/internal.js';
import {createBuiltinModule} from './internal/module.js';

/**
 * Hookable Node.js runtime bootstrapper.
 */
export class Core {
  /** @param {Internal.defaults} [options] */
  constructor(options) {
    const internal = new Internal(options);

    internal.BuiltinModule = createBuiltinModule(internal);

    setProperty(this, 'internal', freeze(internal));
  }

  /** @type {Internal} */
  get internal() {}
}
