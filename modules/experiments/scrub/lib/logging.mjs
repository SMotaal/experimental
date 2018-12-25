export const {log, warn, info, error, group, groupCollapsed, groupEnd, time, timeEnd} = console;

export const dump = promise => (promise && promise.then && promise.then(log, warn), promise);

export const peak = ƒ => (...args) => dump(ƒ(...args));

export const dir = (object, options) => {
  let {
    collapsed = options === false,
    title = typeof options === 'string' ? options : '',
    pad = 0,
  } = !options || typeof options !== 'object' ? {} : options;
  if (object && typeof object === 'object') {
    const entries = Object.entries(object);
    if (!entries.length) return;
    title || (title = entries[0][0]);
    // if (title && title in object) {
    title in object
      ? (collapsed ? groupCollapsed : group)('%s: %o', title, object[title])
      : (collapsed ? groupCollapsed : group)(title);
    for (const [k, v] of entries)
      k === title || log('%s: %o', pad > 0 ? k.padStart(pad) : k, v);
    groupEnd();
    // }
  }
};

export const table = (table, options) => {
  if (!table || typeof table !== 'object') return;
  let {properties = options && options.length >= 0 && options, index} =
    !options || typeof options !== 'object' || options.length >= 0 ? {} : options;
  let length = table.length;
  if (index) {
    let keyed = {};
    for (const entry of Symbol.iterator in table ? table : Object.values(table)) {
      if (!entry) continue;
      if (typeof entry === 'object' && index in entry && entry[index]) {
        const {[index]: key, ...rest} = entry;
        if (key in keyed) {
          let i = 0,
            k;
          while ((k = `${key} (${++i})`) in keyed);
          keyed[k] = rest;
        } else {
          keyed[key] = rest;
        }
      } else {
        keyed = false;
        break;
      }
    }
    keyed && (length = Object.keys((table = keyed)).length);
  }
  properties ? console.table(table, properties) : console.table(table);
  // return length;
};

export const tables = (tables, options) => {
  let {
    collapsed = options === false,
    properties = options && options.length >= 0 && options,
    ...rest
  } = !options || typeof options !== 'object' || options.length >= 0 ? {} : options;
  const tableOptions = {properties, ...rest};

  for (const name in tables) {
    const items = tables[name];
    const length = items.length;
    const title = `${name}${length >= 0 ? ` ${length}` : ''}`;
    (collapsed ? groupCollapsed : group)(title);
    table(items, tableOptions);
    groupEnd();
  }
};
