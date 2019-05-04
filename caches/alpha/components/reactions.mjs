import {define, constants} from './helpers.mjs';

export const reactions = async function* Reactions(target) {
  if (!this) throw `Reactions called on an incompatible without a receiver`;

  let received;
  this.target = target;
  this.reactions = this;
  while (true) {
    received = await (yield {target, received, this: this});
  }
};

const AsyncGenerator = Object.getPrototypeOf(reactions);

class Reactions {
  constructor(target) {
    const generator = reactions.call(this, target);
    Object.setPrototypeOf(generator, this).next();
    return generator;
  }

  get a() {
    return 1;
  }
}

constants(Reactions.prototype, 'target', 'reactions');
Object.defineProperties(Reactions.prototype, {
  ...Object.getOwnPropertyDescriptors(AsyncGenerator.prototype),
  ...Object.getOwnPropertyDescriptors(Object.getPrototypeOf(AsyncGenerator.prototype)),
  [Symbol.toStringTag]: {value: 'Reactions'},
  constructor: {value: Reactions},
});

(async () => {
  const target = {};
  const reactions = new Reactions(target);
  let promise, result, reaction, done;

  console.log({target, reactions});

  const next = async sent => (
    (promise = reactions.next(sent)),
    (result = await promise),
    (done = result.done),
    (reaction = result.value)
  );

  await next(1);

  console.log({target, reactions, reaction});
})();
