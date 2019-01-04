import {sealAndFreeze} from '../helpers.js';

export class CoreModule {
  constructor(id, filename = `${id}.js`) {
    this.filename = filename;
    this.id = id;
    this.exports = {};
    this.reflect = undefined;
    this.exportKeys = undefined;
    this.loaded = false;
    this.loading = false;
  }

  /**
   * @typedef {string & {[Symbol.species]: 'IdentifierName'}} identifier
   * @param {string|function} source
   * @param {{[name:identifier]:any}} scope
   */
  static compile(source, scope) {}
}

sealAndFreeze(CoreModule.prototype);
