import('./file-drop-handler.js')
  .then(
    ({FileDropHandler}) =>
      new FileDropHandler(
        document.getElementById('dropzone') ||
          Object.assign(document.body.appendChild(document.createElement('div')), {
            style: String.raw`
              display: flex; flex: 1;
              justify-self: center; align-items: center;
              justify-content: center; align-content: center;
              user-select: none; -webkit-user-select: none;
            `,
            textContent: 'Drop Files Here',
          }),
      ),
  )
  .catch(console.error);
