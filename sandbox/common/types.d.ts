//@ts-check

/// Sandbox

type sandbox = sandbox.Browser | sandbox.Node;

namespace sandbox {
  interface Sandbox {
    context?: context,
    container?: container,
    console?: console,
  }
  interface Browser extends Sandbox {
    context: context.Browser,
    container: container.Browser,
    console: console.Browser,
  }
  interface Node extends Sandbox {
    context: context.Node,
    container: container.Node,
    console: console.Node,
  }
}

/// Container

type container = container.Browser | container.Node;

namespace container {
  interface Container {
    ['[[context]]']?: context;
    ['[[console]]']?: this['[[context]]']['console'];
  }
  interface Browser extends Container, builtin.browser.Container {
    ['[[context]]']: context.Browser;
  }
  interface Node extends Container, builtin.node.Container {
    ['[[context]]']: context.Node;
  }
}

/// Context

type context = context.Browser | context.Node;

namespace context {
  interface Context {
    console?: console;
  }
  interface Browser extends Context, builtin.browser.Context {
    console: console.Browser;
  }
  interface Node extends Context, builtin.node.Context {
    console: console.Node;
  }
}

/// Console

type console = console.Browser | console.Node;

namespace console {
  interface Console {}
  interface Browser extends Console, builtin.browser.Console {}
  interface Node extends Console, builtin.node.Console {}
}

/// Resources

type resource = resource.locator;

namespace resource {
  interface Locator {}
  type locator = Locator & (string | URL);
}

/// Builtin

namespace builtin {
  interface Globals {

  }
  namespace browser {
    export type Console = Window['console'];
    export type Container = HTMLIFrameElement;
    export type Context = HTMLIFrameElement['contentWindow'];
    export type Document = HTMLIFrameElement['contentDocument'];
  }

  namespace node {
    export {Console} from 'console';
    export {Process} from 'process';
    export {Context, Context as Container} from 'vm';
  }
}
