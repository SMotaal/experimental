#!/usr/bin/env node --experimental-modules

import {existsSync} from 'fs';
import {destinationFrom, basenameFrom, autoExecute, exec} from './helpers.mjs';

async function linkExtension(source, target = '~/.vscode/extensions/') {
  const operation = `linkExtension(${source != null ? `"${source}"` : source} -> ${
    target != null ? `"${target}"` : target
  })`;

  if (!target) throw ReferenceError(`${operation} - invalid target`);
  if (!source || !existsSync(source)) throw ReferenceError(`${operation} - invalid source`);

  source = decodeURI(new URL(source, `file://${process.cwd()}/`).pathname);

  console.group(operation);

  try {
    return exec(`ln -fhs ${exec.escape(source)} ${exec.escape(target)}`);
  } finally {
    console.groupEnd();
  }
  // await unlink()
}

export default autoExecute(((linkExtension.src = import.meta.url), linkExtension));

// let destination = (target = destinationFrom(target, basenameFrom(target) || basenameFrom(source)));

// import shell from 'shelljs';
