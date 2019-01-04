import {Cache} from './cache.js';

const {log, warn, dir, group, groupEnd} = console;

const print = (value, header) => {
  log('\n%s', header || '');
  dir(value, {compact: true});
};

{
  const cache = new Cache();
  console.log({Cache, cache});

  let index = 0;

  {
    const cacheID = undefined;
    group('\n\n\u2014 cacheID = %O', cacheID);
    try {
      const a1 = cache('a', cacheID);
      a1.index || (a1.index = ++index);
      const a2 = cache('a', cacheID);
      const e1 = {index};
      print({[cacheID]: [{index}, {index}]}, 'expected:');
      print({[cacheID]: [a1, a2]}, 'actual:');
      log('\n%O', Object.getPrototypeOf(cache));
    } catch (exception) {
      warn(exception);
    }
    groupEnd();
  }

  {
    const cacheID = 'b';
    group('\n\n\u2014 cacheID = %O', cacheID);
    try {
      const a1 = cache('a', cacheID);
      a1.index || (a1.index = ++index);
      const a2 = cache('a', cacheID);
      print({[cacheID]: [{index}, {index}]}, 'expected:');
      print({[cacheID]: [a1, a2]}, 'actual:');
      log('\n%O', Object.getPrototypeOf(cache));
    } catch (exception) {
      warn(exception);
    }
    groupEnd();
  }

  {
    const cacheID = 'x';
    const cache_x = new Cache(cache, cacheID);
    group('\n\n\u2014 cacheID = %O', cacheID);
    try {
      const a1 = cache_x('a');
      a1.index || (a1.index = ++index);
      const a2 = cache('a', cacheID);
      print({[cacheID]: [{index}, {index}]}, 'expected:');
      print({[cacheID]: [a1, a2]}, 'actual:');
      log('\n%O', Object.getPrototypeOf(cache));
    } catch (exception) {
      warn(exception);
    }
    groupEnd();
  }
}
