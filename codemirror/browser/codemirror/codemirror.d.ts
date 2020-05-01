import '@types/codemirror';

export import Mode = CodeMirror.Mode;
export import EditorConfiguration = CodeMirror.EditorConfiguration;

// declare global {
//   declare namespace CodeMirror {
//     export function defineSimpleMode<T>(name: string, states: T): Mode<T>;
//     export function simpleMode<T>(config: EditorConfiguration, states: T): Mode<T>;
//   }
// }

export {CodeMirror};
