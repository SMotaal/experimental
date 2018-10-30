(async () => {
  if (typeof document !== 'object') return;

  const manifestLink = document.querySelector('link[rel~=manifest][href]');

  if (!manifestLink) return;

  const request = fetch(manifestLink.href).catch(console.info);
  const response = await request;
  const manifest = response && (await response.json());

  if (!manifest) return;

  const {theme_color, background_color, name, display} = manifest;

  /// META
  !name || document.title || (document.title = name);

  /// THEME
  const {
    registerProperty = (CSS.registerProperty = (() => {
      const styles = document.createElement('style');
      styles.textContent = `:root { }`;
      document.head.prepend(styles);
      const rootStyle = styles.sheet.cssRules[0].style;
      return ({name, initialValue}) => {
        rootStyle.setProperty(name, `${initialValue || ''}`);
      };
    })()),

    registerColor = (CSS.registerColor = (name, initialValue, inherits = true) => {
      registerProperty({name, initialValue, inherits, syntax: '<color>'});
    }),
  } = CSS;

  // registerProperty('--app-display-mode', display || '');
  registerColor('--app-theme-color', theme_color || '');
  registerColor('--app-background-color', background_color || '');
})();
