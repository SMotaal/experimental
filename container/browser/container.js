import {Container} from '../core/Container';

/** @typedef {Container.Context} BrowserContainer.Context */

/**
 * @template {BrowserContainer.Context} Context
 * @typedef {Container.Options<Context>} BrowserContainer.Options
 */

/**
 * @template {Container.Context} Context
 * @extends {Container<Context>}
 */
class BrowserContainer extends Container {}

Container.types.browser = BrowserContainer;

export {BrowserContainer};
