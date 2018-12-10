/// <reference types="node" />

declare global {
  namespace NodeJS {
    interface CustomInspect {
      (depth: number, options: CustomInspectOptions): any;
    }

    type InspectStyle = 'number' | 'boolean' | 'string' | 'date' | 'regexp' | 'null' | 'undefined' | 'special' | 'name';

    interface CustomInspectOptions extends InspectOptions {
      stylize(text: string, style: InspectStyle);
    }
  }
}

export = NodeJS;
