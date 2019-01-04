/// <reference lib="esnext" />
/// <reference types="node" />

/// Namespaces
declare namespace NodeJS {
  declare interface ModuleRecord<K = string, N = object> {
    id: K;
    exports: N;
  }
  declare namespace Binding {
    interface namespaces {}
    type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : object;
  }
  declare namespace InternalBinding {
    interface namespaces {}
    type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : object;
  }
  declare namespace Module {
    interface namespaces {}
    type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : object;
  }
  declare namespace NativeModule {
    interface namespaces {}
    // type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : object;
    type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : Module.namespace<K>;
  }
}

/// Internal
// declare namespace process {
//   type binding = NodeJS.Process['binding'];
//   type internalBinding = NodeJS.Process['internalBinding'];
// }
declare namespace NodeJS {
  declare interface Internal {
    binding<K>(id: K): Binding.namespace<K>;
    internalBinding<K>(id: K): InternalBinding.namespace<K>;
    NativeModule: typeof NativeModule;
  }

  declare interface Binding<K = string> extends ModuleRecord<K, Binding.namespace<K>> {}

  declare interface InternalBinding<K = string> extends ModuleRecord<KeyboardEvent, InternalBinding.namespace<K>> {}

  declare namespace Binding {
    interface namespaces {}
    type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : object;
  }
  declare namespace InternalBinding {
    interface namespaces {}
    type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : object;
  }
  declare namespace Module {
    interface namespaces {}
    type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : object;
  }
}

/// NativeModule
declare namespace NodeJS {
  declare interface NativeModule extends Module {
    /** Compiles module from source */
    compile(): void;

    /** Stores module into cache */
    cache(): void;

    /** Wraps exports for named import in ESM  */
    proxifyExports(): void;
  }

  // NativeModule.prototype.

  declare class NativeModule {
    static _source: NativeModule._source;
    static _cache: NativeModule._cache;

    // static require<K>(id: K): NativeModule.namespace<K>;
    // static requireForDeps<K>(id: K): NativeModule.namespace<K>;

    // static getCached<K>(id: K): NativeModule.module<K>;
    // static getSource<K>(id: K): NativeModule._source[K];

    // static isDepsModule<K>(id: K): K is NativeModule.sources.dependencies;
    // static isInternal<K>(id: K): K is NativeModule.sources.internal;

    // static exists<K>(id: K): infer K extends NativeModule.sources ? true : false;
    // static nonInternalExists<K>(
    //   id: K,
    // ): infer K extends NativeModule.sources.internal ? false : K extends NativeModule.sources ? true : false;
  }

  namespace NativeModule {
    type source<K extends string = sources> = {[k in K]: string};
    // interface source<K extends string = sources> extends Record<K, string> {}
    interface _source extends source<sources> {}
    // /* TEST: */ NativeModule._source.fs;

    interface module<K = string, T = namespace<K>> extends NativeModule {
      id: K;
      exports: T;
    }
    type cache<U = namespaces> = {[K in keyof U | sources]: module<K>};
    interface _cache extends cache<namespaces> {}

    function require<K>(id: K): namespace<K>;
    function requireForDeps<K>(id: K): namespace<K>;

    function getCached<K>(id: K): module<K>;
    function getSource<K>(id: K): _source[K];

    function isDepsModule<K>(id: K): K is sources.dependencies;
    function isInternal<K>(id: K): K is sources.internal;

    function exists<K>(id: K): infer K extends sources ? true : false;
    function nonInternalExists<K>(id: K): infer K extends sources.internal ? false : K extends sources ? true : false;

    type require = typeof require;
    type requireForDeps = typeof requireForDeps;
    type getCached = typeof getCached;
    type getSource = typeof getSource;
    type isDepsModule = typeof isDepsModule;
    type isInternal = typeof isInternal;
    type exists = typeof exists;
    type nonInternalExists = typeof nonInternalExists;
    // type static<K = string> = (typeof NativeModule)[K];

    // interface require extends static<'require'> {}
    // interface requireForDeps extends static<'requireForDeps'> {}
    // interface getCached extends static<'getCached'> {}
    // interface getSource extends static<'getSource'> {}
    // interface isDepsModule extends static<'isDepsModule'> {}
    // interface isInternal extends static<'isInternal'> {}
    // interface exists extends static<'exists'> {}
    // interface nonInternalExists extends static<'nonInternalExists'> {}

    // /* TEST: */ NativeModule._cache['util'].id;
    // /* TEST: */ NativeModule._cache['fs'].exports.chown;
    // interface namespaces {}
    // type namespace<K = string, U = namespaces> = K extends keyof U ? U[K] : Module.namespace<K>;
  }
}

/// NativeModule sources
declare namespace NodeJS.NativeModule {
  interface namespaces {
    'internal/options': {
      getOptionValue(option: string);
      options: Map<string>;
      aliases;
    };
  }
  namespace sources {
    type internal =
      | 'internal/assert'
      | 'internal/async_hooks'
      | 'internal/bash_completion'
      | 'internal/bootstrap/cache'
      | 'internal/bootstrap/loaders'
      | 'internal/bootstrap/node'
      | 'internal/buffer'
      | 'internal/child_process'
      | 'internal/cli_table'
      | 'internal/cluster/child'
      | 'internal/cluster/master'
      | 'internal/cluster/round_robin_handle'
      | 'internal/cluster/shared_handle'
      | 'internal/cluster/utils'
      | 'internal/cluster/worker'
      | 'internal/constants'
      | 'internal/crypto/certificate'
      | 'internal/crypto/cipher'
      | 'internal/crypto/diffiehellman'
      | 'internal/crypto/hash'
      | 'internal/crypto/keygen'
      | 'internal/crypto/pbkdf2'
      | 'internal/crypto/random'
      | 'internal/crypto/scrypt'
      | 'internal/crypto/sig'
      | 'internal/crypto/util'
      | 'internal/deps/acorn/dist/acorn'
      | 'internal/deps/acorn/dist/walk'
      | 'internal/deps/node-inspect/lib/_inspect'
      | 'internal/deps/node-inspect/lib/internal/inspect_client'
      | 'internal/deps/node-inspect/lib/internal/inspect_repl'
      | 'internal/deps/v8/tools/SourceMap'
      | 'internal/deps/v8/tools/arguments'
      | 'internal/deps/v8/tools/codemap'
      | 'internal/deps/v8/tools/consarray'
      | 'internal/deps/v8/tools/csvparser'
      | 'internal/deps/v8/tools/logreader'
      | 'internal/deps/v8/tools/profile'
      | 'internal/deps/v8/tools/profile_view'
      | 'internal/deps/v8/tools/splaytree'
      | 'internal/deps/v8/tools/tickprocessor'
      | 'internal/deps/v8/tools/tickprocessor-driver'
      | 'internal/dgram'
      | 'internal/dns/promises'
      | 'internal/dns/utils'
      | 'internal/domexception'
      | 'internal/encoding'
      | 'internal/error-serdes'
      | 'internal/errors'
      | 'internal/fixed_queue'
      | 'internal/freelist'
      | 'internal/fs/promises'
      | 'internal/fs/read_file_context'
      | 'internal/fs/streams'
      | 'internal/fs/sync_write_stream'
      | 'internal/fs/utils'
      | 'internal/fs/watchers'
      | 'internal/http'
      | 'internal/http2/compat'
      | 'internal/http2/core'
      | 'internal/http2/util'
      | 'internal/inspector_async_hook'
      | 'internal/linkedlist'
      | 'internal/modules/cjs/helpers'
      | 'internal/modules/cjs/loader'
      | 'internal/modules/esm/create_dynamic_module'
      | 'internal/modules/esm/default_resolve'
      | 'internal/modules/esm/loader'
      | 'internal/modules/esm/module_job'
      | 'internal/modules/esm/module_map'
      | 'internal/modules/esm/translators'
      | 'internal/net'
      | 'internal/options'
      | 'internal/per_context'
      | 'internal/print_help'
      | 'internal/priority_queue'
      | 'internal/process/coverage'
      | 'internal/process/esm_loader'
      | 'internal/process/main_thread_only'
      | 'internal/process/next_tick'
      | 'internal/process/per_thread'
      | 'internal/process/promises'
      | 'internal/process/stdio'
      | 'internal/process/warning'
      | 'internal/process/worker_thread_only'
      | 'internal/process/write-coverage'
      | 'internal/querystring'
      | 'internal/queue_microtask'
      | 'internal/readline'
      | 'internal/repl'
      | 'internal/repl/await'
      | 'internal/repl/recoverable'
      | 'internal/safe_globals'
      | 'internal/socket_list'
      | 'internal/stream_base_commons'
      | 'internal/streams/async_iterator'
      | 'internal/streams/buffer_list'
      | 'internal/streams/destroy'
      | 'internal/streams/duplexpair'
      | 'internal/streams/end-of-stream'
      | 'internal/streams/lazy_transform'
      | 'internal/streams/legacy'
      | 'internal/streams/pipeline'
      | 'internal/streams/state'
      | 'internal/test/binding'
      | 'internal/test/heap'
      | 'internal/test/unicode'
      | 'internal/timers'
      | 'internal/tls'
      | 'internal/trace_events_async_hooks'
      | 'internal/tty'
      | 'internal/url'
      | 'internal/util'
      | 'internal/util/comparisons'
      | 'internal/util/inspect'
      | 'internal/util/inspector'
      | 'internal/util/types'
      | 'internal/v8_prof_polyfill'
      | 'internal/v8_prof_processor'
      | 'internal/validators'
      | 'internal/vm/source_text_module'
      | 'internal/worker'
      | 'internal/wrap_js_stream';

    type dependencies =
      | 'node-inspect/lib/_inspect'
      | 'node-inspect/lib/internal/inspect_client'
      | 'node-inspect/lib/internal/inspect_repl'
      | 'v8/tools/SourceMap'
      | 'v8/tools/arguments'
      | 'v8/tools/codemap'
      | 'v8/tools/consarray'
      | 'v8/tools/csvparser'
      | 'v8/tools/logreader'
      | 'v8/tools/profile'
      | 'v8/tools/profile_view'
      | 'v8/tools/splaytree'
      | 'v8/tools/tickprocessor'
      | 'v8/tools/tickprocessor-driver';
  }

  type sources =
    | '_http_agent'
    | '_http_client'
    | '_http_common'
    | '_http_incoming'
    | '_http_outgoing'
    | '_http_server'
    | '_stream_duplex'
    | '_stream_passthrough'
    | '_stream_readable'
    | '_stream_transform'
    | '_stream_wrap'
    | '_stream_writable'
    | '_tls_common'
    | '_tls_wrap'
    | 'assert'
    | 'async_hooks'
    | 'buffer'
    | 'child_process'
    | 'cluster'
    | 'config'
    | 'console'
    | 'constants'
    | 'crypto'
    | 'dgram'
    | 'dns'
    | 'domain'
    | 'events'
    | 'fs'
    | 'http'
    | 'http2'
    | 'https'
    | 'inspector'
    | sources.internal
    | 'module'
    | 'net'
    | 'os'
    | 'path'
    | 'perf_hooks'
    | 'process'
    | 'punycode'
    | 'querystring'
    | 'readline'
    | 'repl'
    | 'stream'
    | 'string_decoder'
    | 'sys'
    | 'timers'
    | 'tls'
    | 'trace_events'
    | 'tty'
    | 'url'
    | 'util'
    | 'v8'
    | sources.dependencies
    | 'vm'
    | 'worker_threads'
    | 'zlib';
}

/// Binding.namespaces
declare namespace NodeJS.Binding {
  interface namespaces {
    config: {
      hasIntl: boolean;
      hasSmallICU: boolean;
      hasTracing: boolean;
      hasNodeOptions: boolean;
      exposeInternals: boolean;
      icuDataDir: string;
      bits: number;
      debugOptions: {inspectorEnabled: boolean; host: number; port: number};
    };
  }
}
/// InternalBinding.namespaces
declare namespace NodeJS.InternalBinding {
  interface namespaces {
    config: {
      hasIntl: boolean;
      hasSmallICU: boolean;
      hasTracing: boolean;
      hasNodeOptions: boolean;
      exposeInternals: boolean;
      icuDataDir: string;
      bits: number;
      debugOptions: {inspectorEnabled: boolean; host: number; port: number};
    };
  }
}
/// Module.namespaces
declare namespace NodeJS.Module {
  interface namespaces {
    buffer: typeof import('buffer');
    querystring: typeof import('querystring');
    events: typeof import('events');
    http: typeof import('http');
    cluster: typeof import('cluster');
    worker_threads: typeof import('worker_threads');
    zlib: typeof import('zlib');
    os: typeof import('os');
    https: typeof import('https');
    punycode: typeof import('punycode');
    repl: typeof import('repl');
    readline: typeof import('readline');
    vm: typeof import('vm');
    child_process: typeof import('child_process');
    url: typeof import('url');
    dns: typeof import('dns');
    net: typeof import('net');
    dgram: typeof import('dgram');
    fs: typeof import('fs');
    path: typeof import('path');
    string_decoder: typeof import('string_decoder');
    tls: typeof import('tls');
    crypto: typeof import('crypto');
    stream: typeof import('stream');
    util: typeof import('util');
    assert: typeof import('assert');
    tty: typeof import('tty');
    domain: typeof import('domain');
    constants: typeof import('constants');
    module: typeof import('module');
    process: typeof import('process');
    v8: typeof import('v8');
    timers: typeof import('timers');
    console: typeof import('console');
    async_hooks: typeof import('async_hooks');
    http2: typeof import('http2');
    perf_hooks: typeof import('perf_hooks');
    trace_events: typeof import('trace_events');
  }
}

// declare interface NameMap<T> {
//   [name: string]: T;
// }
