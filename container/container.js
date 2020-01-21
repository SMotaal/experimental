// @ts-check
import {Container} from './core/container.js';
// import {BrowserContainer as Container} from './browser/container.js';

/**
 * @template {Container.Context} Context
 * @param {Container.Options<Context>} options
 */
const createContainer = async options => {
  const {type} = {...options};
  return new Container(options);
};
