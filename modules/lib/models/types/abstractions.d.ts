/// Binding Abstractions
// @ts-check

// import {Namespace} from './namespaces';

export interface AbstractBinding<K = string> {
  /** Extrinsic name from the exporting namespace. */
  bindingName: K;
  type?: 'bound' | 'linked';
}

export interface AbstractImport<K = string> extends AbstractBinding<K> {
  /** Intrinsic name within the importing namespace */
  importedName: string;
  importingNamespace?: AbstractNamespace;
}

export interface AbstractExport<K = string> extends AbstractBinding<K> {
  /** Intrinsic name within the exporting namespace. */
  exportedName: string;
  exportingNamespace?: AbstractNamespace;
}

export interface AbstractLink<K = string> extends AbstractBinding<K> {
  /** Specifier for the exporting namespace - before linking */
  linkedSpecifier: string;

  /** Binding from the exporting namespace - after linking */
  linkedBinding?: Promise<AbstractBinding<K>>;
}

export interface AbstractBindings<K = string, T extends AbstractBinding<K> = AbstractBinding<K>> {
}

export interface AbstractNamespace {
  bindings: AbstractBindings
}
