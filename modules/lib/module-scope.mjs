import Module from './module.mjs';

const {freeze, setPrototypeOf} = Object;
const GlobalScope = (1, eval)('this');
const globals = (({eval: $eval, Object}) => ({eval: $eval, Object, Module}))(GlobalScope);

export default new Proxy(freeze(setPrototypeOf({...globals}, GlobalScope)), {
  get: (target, property) => {
    if (typeof property !== 'string') return;
    if (property in globals) return globals[property];
    const value = GlobalScope[property];
    return (value && typeof value === 'function' && value.bind(GlobalScope)) || value;
  },
  set: (target, property) => {
    throw ReferenceError(`${property} is not defined`);
  },
});
