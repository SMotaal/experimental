const Basename = /[^/?#]+(?=[?#].*$|$)/;
const Flatname = /(?:[^/?#]*|)(?:[?#].*$|$)/;
const Pathname = /(?:\b[a-z]:\/|\B\/)(?=[^/])[^?#]+|^[^/?#]+(?=[?#].*$|$)/i;

export const basenameFrom = path => (Basename.exec(path) || '')[0];
export const pathnameFrom = path => (Pathname.exec(path) || '')[0];

export const destinationFrom = (target, basename) =>
  (target && `${target}`.replace(Flatname, `${basename || basenameFrom(target) || ''}`)) || target;

export const autoExecute = (command, parameters = process.argv.slice(2)) => {
  const main = pathnameFrom(process.argv[1]);
  const src = command.src && pathnameFrom(command.src);

  if (src && main.startsWith(src)) {
    command(...parameters);
  } else if (parameters.length && (!src || typeof src !== 'string')) {
    console.warn(`Failed to execute: command("%s").src cannot be %o`, command, src);
  }
  return command;
};

let child_process;

/**
 * @type {typeof import('child_process').exec}
 */
export const exec = async command =>
  await (exec.exec ||
    (exec.exec = await (exec.exec = Promise.all([import('child_process'), import('util')]).then(
      ([{exec}, {promisify}]) => promisify(exec),
    ))))(command);

exec.escape = argument => (
  (argument = `${argument || ''}`), /".*"$/.test(argument) ? argument : argument.replace(/\\? /g, '\\ ')
);

class Location {
  constructor(specifier, referrer) {
    this.specifier = specifier;
    this.referrer = referrer;
  }

  toString(referrer = this.referrer) {
    let specifier = this.specifier;

    const location = `${(typeof specifier === 'function'
      ? specifier(referrer)
      : specifier.toString
      ? specifier.toString(referrer)
      : specifier) || './'}`;

    const base = `${referrer || ''}` || undefined;

    return decodeURI(new URL(location, base).href);
  }
}

export const getCurrentLocation =
  typeof process === 'object' && process && typeof process.cwd === 'function'
    ? (cwd => `file://${cwd()}`)(cwd.bind(process))
    : typeof location === 'object' && location && location.href
    ? () => new URL('./', location).href
    : () => './';

// export const absolute = (specifier, base = getCurrentLocation()) => ;

// export const sh = (...args) => {
//   if (args.length && args[0] && args[0].raw && args[0].raw.length === args[0].length) {
//     args =
//   }
// };

// export const sh = async (strings, ...values) => {
//   const command = String.raw(strings, ...values).trimLeft();
//   if (command) {
//     return (await (sh.exec ||
//       (sh.exec = await (sh.exec = Promise.all([import('child_process'), import('util')]).then(([{exec}, {promisify}]) =>
//         promisify(exec),
//       )))))(command, {cwd: process.cwd(), stdio: 'inherit'});
//   }
// };

// const dst = destinationFrom(`a/b?c`, 'd');
// console.log({main, src, dst});
