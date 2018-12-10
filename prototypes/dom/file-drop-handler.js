//* SEE: https://s.codepen.io/daflair/debug/zyYReX/VJMxxVXRwXXM
//* SEE: https://codepen.io/daflair/pen/zyYReX

export class FileDropHandler {
  constructor(target) {
    const options = {passive: false};
    target.addEventListener('drop', event => this.drop(event), options);
    target.addEventListener('dragover', event => this.dragover(event), options);
    this.target = target;
    this.enabled = true;
  }
  async upload(files) {
    console.info('Uploading:', files);
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.info('√ Done');
  }
  async drop(event) {
    event.stopPropagation(), event.preventDefault();
    if (!this.enabled) return;
    const files = Array.from(event.dataTransfer && event.dataTransfer.files);
    if (!files.length) return;
    console.log('drop:\tfiles %O\tevent %O', files, event);
    this.enabled = false;
    try {
      // do work here and be sure to await
      await this.upload(files);
    } finally {
      this.enabled = true;
    }
  }
  dragover(event) {
    event.preventDefault();
    event.dropEffect = this.enabled ? 'copy' : 'none';
  }
  get enabled() {
    return this.target.hasAttribute('enabled');
  }
  set enabled(value) {
    value ? this.target.setAttribute('enabled', '') : this.target.removeAttribute('enabled');
  }
}
