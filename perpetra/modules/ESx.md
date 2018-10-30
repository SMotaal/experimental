# ESx Modules

Runtime scaffolding for modules.

```ts
declare interface NameMap<M> {
  [name: string]: M;
}

declare interface ModuleRecord<
  P,
  N,
  R extends RealmRecord = RealmRecord,
  E extends LexicalEnvironment = undefined,
  V = undefined
> {
  ['[[id]]']: P;
}

// declare type Module

declare interface ModuleNamespace<P> {
  ['[[record]]']: ModuleRecord<P, this>;
  ['default']?: unknown;
  [name: string]: unknown;
}

declare type Namespace<M = {}, P = string> = ModuleNamespace<P> & {readonly [K in keyof M]: M[K]};

declare type Imports<M> = NameMap<Namespace<unknown>> & {readonly [K in keyof M]: Namespace<M[K]>};

declare const imports: Imports<{
  './module1.js': {default: any; x: any};
  './module2.js': {default: any; x: any};
}>;

declare const imports: {
  './module1.js': Namespace<{default: any; x: any}>;
  './module2.js': Namespace<{default: any; x: any}>;
};

declare const exports: [];
```
