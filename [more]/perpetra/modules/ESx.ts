import ECMAScript from './ECMAScript';

namespace ESx {
  export interface ModuleNamespace extends ECMAScript.ModuleNamespace {
    ['default']?: any;
    [name: string]: any;
  }

  export interface ModuleRecord<P, N extends ModuleNamespace = ModuleNamespace> extends ECMAScript.ModuleRecord<N> {
    ['[[id]]']: P;
  }
}

export default ESx;
