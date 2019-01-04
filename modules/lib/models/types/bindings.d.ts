// @ts-check

import {AbstractBinding, AbstractBindings, AbstractImport, AbstractExport, AbstractLink} from './abstractions';
import {Namespace} from './namespaces';

/// Binding

declare global {
  namespace bindings {
    export interface Binding<K = string> extends AbstractBinding<K> {
      get?: <V>() => V | void;
      set?: <V>(value: V) => void;
      bind: (binding: Pick<this, 'get' | 'set'>) => void;
    }

    export interface Export<K = string> extends AbstractExport<K> {
      get?: <V>() => V | void;
      set?: <V>(value: V) => void;
    }

    /**
     * Maybe:
     *    export default …
     *    export {… K}
     *    export {… K} from (instantiating or cyclic)
     */
    export interface BoundExport<K = string> extends Export<K>, Binding<K> {
      get: <V>() => V | void;
      set: <V>(value: V) => void;
      type?: 'bound';
    }

    /**
     * Maybe:
     *    export * from
     *    export {… K} from (instantiated)
     */
    export interface LinkedExport<K = string> extends Export<K>, AbstractLink<K> {
      get: <V>() => V | void;
      type?: 'linked';
    }

    export interface Import<K = string> extends AbstractImport<K> {
      get?: <V>() => V | void;
      set?: <V>(value: V) => void;
    }

    /**
     * Maybe:
     *    import * as K from (cyclic)
     *    import K from (cyclic)
     *    import {… K} from (instantiating or cyclic)
     */
    export interface BoundImport<K = string> extends Import<K>, Binding<K> {
      get: <V>() => V | void;
      type?: 'bound';
    }

    /**
     * Maybe:
     *    import K from
     *    import {… K} from (instantiated)
     *    import * as K from
     */
    export interface LinkedImport<K = string> extends Import<K>, AbstractLink<K> {
      get: <V>() => V | void;
      type?: 'linked';
    }

    export interface NamespaceBinding<K = string> extends Binding<K> {}

    export interface NamespaceImport<N extends Namespace, K = string> extends Import<K>, NamespaceBinding<K> {
      importingNamespace: N;
    }

    export interface NamespaceExport<N extends Namespace, K = string> extends Export<K>, NamespaceBinding<K> {
      exportingNamespace: N;
    }
  }
}

/// Bindings

declare global {
  namespace bindings {
    export interface Bindings<K = string, T extends AbstractBinding<K> = NamespaceBinding<K>>
      extends AbstractBindings<K, T> {
      readonly '<K>'?: K;
      readonly '<T>'?: T;
    }

    export interface NamespaceBindings<N extends Namespace, K = string> extends Bindings<K> {
      readonly '<N>'?: N;
      readonly bindingNamespace: N;
      readonly exportedBindings?: ExportedBindings<N, K>;
      readonly importedBindings?: ImportedBindings<N, K>;
    }

    export interface ImportedBindings<N extends Namespace, K = string> extends Bindings<K, NamespaceImport<N, K>> {
      readonly '<N>'?: N;
      readonly namespaceBindings: NamespaceBindings<N, K>;
    }

    export interface ExportedBindings<N extends Namespace, K = string> extends Bindings<K, NamespaceExport<N, K>> {
      readonly '<N>'?: N;
      readonly namespaceBindings: NamespaceBindings<N, K>;
    }
  }
}

export as namespace bindings;
