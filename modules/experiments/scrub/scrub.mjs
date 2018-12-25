import {Scrubber} from './lib/scrubber.mjs';
import {log, group, groupCollapsed, groupEnd} from './lib/logging.mjs';
import {dir, table, tables, peak, time, timeEnd} from './lib/logging.mjs';
import packages from './packages.mjs';

const defaults = {
  // limit: 50,
  packages,
  tables: {index: 'identifier'},
};

const Path = /^\.{0,2}\/?[^\n\s\:]+$/;
const EntryField = /^(?:main|module|browser|module\:.+)$/;
const NonEntryField = /^(?:ava|authors?|babel|bili|bin|bower|bugs|cdn|config|contributors?|copyrights?|dependencies|description|directories|editions|emails?|engines?|esm|false|files?|formats?|global|husky|id|jam|jsdelivr|jspm|keywords|licenses?|lock|maintainers?|metadata|name|namespace|readme|registry|repository|scripts|source|src|style|title|types?|typings?|unpkg|users?|version|(?:[\$\@\_]|browserify|browsers|bundle|collec|config|generator|git|gh|green|group|id|jest|just|lint|minified|npm|prefer|react|tonic|auto).*|.*[A-Z].*|.*(?:doc|Dependencies|size))$/;

async function run(options) {
  const {packages = defaults.packages, limit, entries} = (options = options
    ? {...defaults, ...options}
    : defaults);

  let controller;
  try {
    const scrubber = new Scrubber({
      fetch: {
        cache: 'force-cache',
        signal: (controller = new AbortController()).signal,
      },
    });
    const scrub = scrubber.scrub;

    const summary = details => {
      const {bins, data, types} = records || (records = Records());
      const {identifier, root} = details; // package: {dependencies, devDependencies}
      const entries = {};
      // const unknown = {};
      const fields = Object.keys(details.package);
      for (const field of fields) {
        if (!field || /\s|^\d+|^[_/]/.test(field)) continue;
        const maybeEntry =
          bins.entry[field] >= 0 ||
          !(bins.entry[field] =
            !EntryField.test(field) && NonEntryField.test(field) ? -Infinity : 0);

        let record, bin;

        if (maybeEntry) {
          const value = details.package[field];
          const type = value === null ? 'null' : typeof value;
          (types[type] || (types[type] = {count: 0})).count++;
          record = {identifier, [field]: value};
          // bin = 'unknown';
          if (type === 'string') {
            if (value && Path.test(value)) {
              const url = `${new URL(value, root)}`;
              if (url.startsWith(root)) {
                record[field] = entries[field] = value;
                bin = 'entry';
                // record.path = url.slice(root.length);
              }
            }
          } else {
            record.type = type;
          }
        } else {
          bin = 'other';
        }
        if (!bin) {
          (data.unknown[field] || (data.unknown[field] = [])).push(record);
        } else {
          // bin || (bin = 'other');
          ++(bins[bin] || (bins[bin] = {}))[field] || (bins[bin][field] = 1);
          record &&
            ((data[bin] || (data[bin] = {}))[field] || (data[bin][field] = [])).push(record);
        }
      }
      return {identifier, ...entries};
      // dependencies: {main: dependencies, dev: devDependencies},
      // fields: fields.join('\n'),
      // details,
    };

    let records;

    {
      const list = packages.slice(0, limit >= 0 ? limit : undefined);
      const mark = `Scrubbing ${list.length} packages`;
      time(mark);
      const promises = list.map(scrub);
      // controller.abort();
      const results = (await Promise.all(promises)).map(summary);
      group(mark);
      timeEnd(mark);

      const options = {tables: {index: 'identifier', collapsed: true}};

      if (results.length) {
        log(results);
        const {
          summaries,
          statistics,
          map: {entry: Entry, unknown: Unknown, other: Other},
        } = summarize(records, options);

        const files = [JSONFile('scrubbed-packages-paths-only.json', results)];
        Entry &&
          Entry in summaries &&
          files.push(JSONFile('scrubbed-fields-paths-valid.json', summaries[Entry]));
        Unknown &&
          Unknown in summaries &&
          files.push(JSONFile('scrubbed-fields-paths-invalid.json', summaries[Unknown]));
        Other &&
          Other in summaries &&
          files.push(JSONFile('scrubbed-fields-others.json', summaries[Other]));
        statistics && files.push(JSONFile('scrubbed-statistics.json', statistics));

        output(...files);
      }
      groupEnd();
      controller = null;
      log('√ Done');
    }
  } finally {
    if (controller) controller.abort();
  }
}

function summarize(records, options) {
  const sorter = ([, a], [, b]) => (a.length > b.length && -1) || a.length < b.length;
  return (summarize = records => {
    if (!(records && records.bins && records.data)) return;
    const {
      bins,
      data,
      types,
      map = {},
      map: {entry: Entry, unknown: Unknown, other: Other},
    } = records;

    const results = {};

    // TODO: delete summarized records // Object.assign(records, Records());
    if (data) {
      {
        const {entry, other, unknown = {}} = data;
        data.unknown = {};
        for (const field in unknown) {
          const entries = unknown[field];
          if (!entries.length) continue;
          const bin = field in entry || EntryField.test(field) ? 'unknown' : 'other';
          bins[bin][field] = (bins[bin][field] || 0) + entries.length;
          (data[bin][field] || (data[bin][field] = [])).push(...entries);
        }
      }

      const summaries = (results.summaries = {});

      const entry = Entry && (summaries[Entry] = sort(data.entry, sorter));
      Unknown && (summaries[Unknown] = sort(data.unknown, sorter));
      Other && (summaries[Other] = sort(data.other, sorter));

      const statistics = (results.statistics = {});

      for (const bin in bins) {
        const entries = [];
        for (const entry of Object.entries(bins[bin])) entry[1] > 0 && entries.push(entry);
        statistics[map[bin] || bin] = sort(entries, sorter);
      }

      types && (statistics.type = types);

      dir(summaries, {collapsed: true, title: 'Summaries'});

      if (entry)
        group('Entries'),
          tables(summaries[Entry], (options && options.tables) || undefined),
          groupEnd();

      dir({statistics}, {collapsed: true, title: 'Statistics'});

      results.map = map;
    }

    return results;
  })(...arguments);
}

function sort(object) {
  const keyedSort = ([, a], [, b]) => (a < b && -1) || a > b;
  const valueSort = (a, b) => (a < b && -1) || a > b;
  const reducer = (e, [k, v]) => ((e[k] = v), e);

  return (sort = (object, sorter) => {
    if (!object || typeof object !== 'object') return object;
    const entries = Symbol.iterator in object ? [...object] : Object.entries(object);
    if (!entries.length) return object;
    const keyed = entries[0].length === 2;
    entries.sort(sorter || (keyed ? keyedSort : valueSort));
    return (keyed && entries.reduce(reducer, {})) || entries;
  })(...arguments);
}

function JSONFile(name, data, options) {
  return (JSONFile = (name, data, {lastModified = new Date(), type = 'application/json'} = {}) =>
    new File([JSON.stringify(data, null, 2)], name, {type, lastModified}))(...arguments);
}

async function output(...files) {
  const body = document.body;
  const links = [];
  for (const file of files) {
    try {
      links.push(
        `<li><a href="${URL.createObjectURL(file)}" download="${file.name}">${file.name}</a></li>`,
      );
    } catch (exception) {
      console.warn('%O %o', {file}, exception);
    }
  }
  body.innerHTML = `<ul>${links.join('')}</ul>`;
  // /** @type {HTMLTemplateElement} */
  // const template = output.template || (output.template = document.createElement('template'));
  // template.innerHTML = `<div>${links.join('')}</div>`;
  // body.prepend(template.content.firstElementChild);
  // template.innerHTML = '';
}

function Stub() {
  return (Stub = ({entry = {}, unknown = {}, other = {}, ...rest} = {}) => ({
    entry,
    unknown,
    other,
    ...rest,
  }))(...arguments);
}

function Records() {
  return (Records = ({bins, data, types} = {}) => ({
    bins: Stub(bins),
    data: Stub(data),
    types: {},
    map: {
      entry: 'valid-entries',
      unknown: 'invalid-entries',
      other: 'other',
    },
  }))(...arguments);
}

try {
  const [limit] = /\d+$/.exec(location.hash);
  limit && (defaults.limit = parseInt(limit));
} catch (exception) {}

run(); // setTimeout(run, 100);

// const NonEntryField = /^(?:[$@_].+|(?:author|bin|bugs|cdn|collec|config|contributors|dependencies|description|dev|directories|email|engines|files|git|global|group|id|jsdelivr|minified|name|npm|prefer|react|registry|repository|scripts|source|src|style|tonic|types|typings|unpkg|version).*|.*I[dD])$/;
// const EntryField = /^(?!_|author|bin|cdn|dependencies|description|dev|directories|files|git|jsdelivr|minified|name|npm|prefer|react|registry|repository|scripts|source|src|style|tonic|types|typings|unpkg).+$/i;

// const flat = bins =>
//   bins && typeof bins === 'object'
//     ? (Symbol.iterator in bins ? [...bind] : Object.values(bins).map(bins => flat(bins))).flat()
//     : [];
// const counter = (count, x) => ((x = count + x) > count ? x : count);
// const count = counts => counts.reduce(counter, 0);
// const tally = bins => count(flat(bins));
// const total = (bins && tally(bins)) || 0;
// console.group('%d records in %d bins (%d entries)', total);
// fields: {}, // entries
// entries: split('main module browser main:umd main:cjs main:esm main:mjs main:iife main:amd amd esm umd types typings jsnext:main unpkg'),

// map: {
//   entry: Entry = (map.entry = 'valid-entry'),
//   unknown: Unknown = (map.unknown = 'invalid-entry'),
//   other: Other = (map.other = 'other'),
// },

// const Stub = ({entry = {}, unknown = {}, other = {}, ...rest} = {}) => ({
//   entry,
//   unknown,
//   other,
//   ...rest,
// });

// const Records = ({bins, data, types} = {}) => ({bins: Stub(bins), data: Stub(data), types: {}});
