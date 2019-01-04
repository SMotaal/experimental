// @ts-check

import {AbstractNamespace} from './abstractions';
import {NamespaceBindings, ExportedBindings, ImportedBindings} from './bindings'; // Export, Import

declare global {
  namespace namespaces {
    export interface Namespace extends AbstractNamespace {
      bindings: NamespaceBindings<this>;
    }

    export interface ExportingNamespace extends AbstractNamespace {
      bindingNamespace: Namespace;
      bindings: ExportedBindings<this['bindingNamespace']>;
    }

    export interface ImportingNamespace extends AbstractNamespace {
      bindingNamespace: Namespace;
      bindings: ImportedBindings<this['bindingNamespace']>;
    }
  }
}

export as namespace namespaces;
