import './codemirror';
import {Mode, EditorConfiguration} from './codemirror';

// import Mode = CodeMirror.Mode;
// import EditorConfiguration = CodeMirror.EditorConfiguration;

declare global {
  declare namespace CodeMirror {
    export function defineSimpleMode<T>(name: string, states: T): Mode<T>;
    export function simpleMode<T>(config: EditorConfiguration, states: T): Mode<T>;
    export function simpleMode<T>(config: EditorConfiguration, states: T): Mode<T>;
  }
}

export import defineSimpleMode = CodeMirror.defineSimpleMode;
export import simpleMode = CodeMirror.simpleMode;

export {CodeMirror};
