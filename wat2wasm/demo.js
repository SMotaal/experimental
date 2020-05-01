/*
 * Copyright 2016 WebAssembly Community Group participants
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Split(['#top-left', '#top-right']);
Split(['#bottom-left', '#bottom-right']);

Split(['#top-row', '#bottom-row'], {
  direction: 'vertical',
});

let features = {};

console.log(WabtModule());

(async () => ({
  wabt: WabtModule(),
  wasmFeatures: Object.fromEntries(
    await Promise.all(
      Object.entries((await import('./wasm-feature-detect.mjs')).wasmFeatureDetect).map(async ([feature, detect]) => [
        feature,
        await detect(),
      ]),
    ),
  ),
}))().then(function ({wabt, wasmFeatures}) {
  // console.log({wabt, wasmFeatures});
  // return;
  let FEATURES = [
    'exceptions',
    'mutable_globals',
    'sat_float_to_int',
    'sign_extension',
    'simd',
    'threads',
    'multi_value',
    'tail_call',
    'bulk_memory',
    'reference_types',
  ];

  let kCompileMinMS = 100;

  const outputEl = /** @type {HTMLPreElement} event */ (document.getElementById('output'));
  const jsLogEl = /** @type {HTMLPreElement} event */ (document.getElementById('js_log'));
  const selectEl = /** @type {HTMLSelectElement} event */ (document.getElementById('select'));
  const downloadEl = /** @type {HTMLButtonElement} event */ (document.getElementById('download'));
  const featuresEl = /** @type {HTMLButtonElement} event */ (document.getElementById('features'));
  const downloadLink = /** @type {HTMLAnchorElement} event */ (document.getElementById('downloadLink'));
  let binaryBuffer = null;
  let binaryBlobUrl = null;

  for (let feature of FEATURES) {
    let featureEl = /** @type {HTMLInputElement} event */ (document.getElementById(feature));
    features[feature] = featureEl.checked || (wasmFeatures && wasmFeatures[feature] && (featureEl.checked = true));
    featureEl.addEventListener('change', event => {
      let feature = event.target.id;
      features[feature] = /** @type {HTMLInputElement} event */ (event.target).checked;
      onWatChange();
    });
  }
  console.log({wasmFeatures, features});
  let wasmInstance = null;

  let wrappedConsole = Object.create(console);

  wrappedConsole.log = (...args) => {
    let line = args.map(String).join('') + '\n';
    jsLogEl.textContent += line;
    console.log(...args);
  };

  let watEditor = CodeMirror(
    elt => {
      document.getElementById('top-left').appendChild(elt);
    },
    {
      mode: 'wast',
      lineNumbers: true,
    },
  );

  let jsEditor = CodeMirror(
    elt => {
      document.getElementById('bottom-left').appendChild(elt);
    },
    {
      mode: 'javascript',
      lineNumbers: true,
    },
  );

  function debounce(f, wait) {
    let lastTime = 0;
    let timeoutId = -1;
    let wrapped = function () {
      let time = +new Date();
      if (time - lastTime < wait) {
        if (timeoutId == -1) timeoutId = setTimeout(wrapped, lastTime + wait - time);
        return;
      }
      if (timeoutId != -1) clearTimeout(timeoutId);
      timeoutId = -1;
      lastTime = time;
      f.apply(null, arguments);
    };
    return wrapped;
  }

  function compile() {
    outputEl.textContent = '';
    let binaryOutput;
    let module;
    try {
      let options = {
        source: watEditor.getValue(),
        fileame: 'test.wast',
        features,
      };
      module = wabt.parseWat(options.fileame, options.source, options.features);
      module.resolveNames();
      module.validate(features);
      let binaryOutput = module.toBinary({log: true, write_debug_names: true});
      console.log('compile(%o)\n\t=> module %o\n\t=> output %o', options, module, binaryOutput);
      outputEl.textContent = binaryOutput.log;
      binaryBuffer = binaryOutput.buffer;
      let blob = new Blob([binaryOutput.buffer]);
      if (binaryBlobUrl) {
        URL.revokeObjectURL(binaryBlobUrl);
      }
      binaryBlobUrl = URL.createObjectURL(blob);
      downloadLink.setAttribute('href', binaryBlobUrl);
      downloadEl.classList.remove('disabled');
    } catch (e) {
      outputEl.textContent += e.toString();
      downloadEl.classList.add('disabled');
    } finally {
      if (module) module.destroy();
    }
  }

  function run() {
    jsLogEl.textContent = '';
    if (binaryBuffer === null) return;
    try {
      let wasm = new WebAssembly.Module(binaryBuffer);
      let js = jsEditor.getValue();
      let fn = new Function('wasmModule', 'console', js + '//# sourceURL=demo.js');
      fn(wasm, wrappedConsole);
    } catch (e) {
      jsLogEl.textContent += String(e);
    }
  }

  let onWatChange = debounce(compile, kCompileMinMS);
  let onJsChange = debounce(run, kCompileMinMS);

  function setExample(index) {
    let example = examples[index];
    watEditor.setValue(example.contents);
    onWatChange();
    jsEditor.setValue(example.js);
    onJsChange();
  }

  watEditor.on('change', onWatChange);
  jsEditor.on('change', onJsChange);
  selectEl.addEventListener(
    'change',
    {
      onchange(event) {
        setExample(this.selectedIndex);
      },
    }.onchange,
  );
  downloadEl.addEventListener(
    'click',
    {
      onDownloadClicked(e) {
        // See https://developer.mozilla.com/en-US/docs/Web/API/MouseEvent
        let event = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
        });
        downloadLink.dispatchEvent(event);
      },
    }.onDownloadClicked,
  );

  for (let i = 0; i < examples.length; ++i) {
    let example = examples[i];
    let option = document.createElement('option');
    option.textContent = example.name;
    selectEl.appendChild(option);
  }
  selectEl.selectedIndex = 1;
  setExample(selectEl.selectedIndex);
});
