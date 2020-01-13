#!/usr/bin/env node

// @ts-check

import process from 'process';
import {existsSync} from 'fs';
import {execSync} from 'child_process';

export const pull = (source, branch = 'master', ...flags) => {
  if (flags.includes('--help')) return void console.log(`\ngit:subtree:pull:\n\n\tSee README.md for usage!\n`);

  if (!source || !/^[A-Za-z][-A-Za-z0-9]*\/[-A-Za-z0-9\._]+$/.test(source))
    throw Error(`git:subtree:pull: invald source ${source}`);

  if (!branch) branch = 'master';
  else if (!/^[-.0-9A-Za-z_~!%()*\\\/]+$/.test(branch)) throw Error(`git:subtree:pull: invald branch ${branch}`);

  if (!`${execSync(`git remote`)}`.split('\n').includes(source)) {
    try {
      console.group(`\nAdding remote ${source}`);
      execSync(`git remote add "${source}" "https://github.com/${source}";`, {stdio: 'inherit'});
    } finally {
      console.groupEnd();
    }
  }

  try {
    console.group(`\nPulling into @${source}/`);
    try {
      execSync(`git subtree pull --squash --prefix=@${source}/ ${source} ${branch};`);
    } catch (exception) {
      execSync(`git subtree add --squash --prefix=@${source}/ ${source} ${branch};`, {stdio: 'inherit'});
    }
  } finally {
    console.groupEnd();
  }
};

process &&
  process.argv &&
  import.meta.url.endsWith(process.argv[1]) &&
  (/^(?:-h|(?:--|)help|)$/.test(process.argv.slice(2).join('') || '')
    ? pull(undefined, undefined, '--help')
    : pull(...process.argv.slice(2)));
