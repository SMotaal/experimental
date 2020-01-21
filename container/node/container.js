import {Container} from '../core/Container';
import {createContext} from 'vm';

/** @typedef {Container.Context} NodeContainer.Context */

/**
 * @template {NodeContainer.Context} Context
 * @typedef {Container.Options<Context>} NodeContainer.Options
 */

/**
 * @template {Container.Context} Context
 * @extends {Container<Context>}
 */
class NodeContainer extends Container {}

NodeContainer.defaults = {
  .../** @type {Container.Options}  */ (undefined),
  /** @type {'node'} */
  type: ('node'),
};

Object.freeze(Object.setPrototypeOf(NodeContainer.defaults, Container.defaults));

export {NodeContainer};
