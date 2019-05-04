declare interface TemplateTag<T = string, V extends any[] = any[]> {
  (strings: TemplateStringsArray, ... values: V): T;
}

declare type Definition<T extends {}> = Partial<{ -readonly [K in keyof T]: T[K]; }>;

declare namespace components.helpers {
  interface Resource {
    readonly file: string;
    readonly type: string;
    readonly base: string;
    readonly body: any;
    readonly url: string;
    readonly blob: Blob;

    text: string;

    html: TemplateTag<this>;

    raw: TemplateTag;
  }


  class Resource {
    constructor(properties?: Definition<Partial<this>>);
  }

  interface Styles extends Resource {
    css: TemplateTag<this>;
  }

  class Styles extends Resource {
    constructor(file: string, base: string, properties?: Definition<Partial<this>>);
  }

  type resource = (resource: Definition<Partial<Resource>>) => Resource;
  type html = TemplateTag<HTMLElement>;
}
