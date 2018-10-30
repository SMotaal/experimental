(() => {

  const runTest = test => {
    const path = require.resolve(test);
    const source = `${require('fs').readFileSync(path)}`;
    const [, flags = ''] =
      /^\/\/ +flags: +(--.*?) *$/mi.exec(`${source}`) || '';
    const command = `${process.argv[0]} ${(flags && `${flags} `) || ''}${path}`;
    const stdio = [0, 1, 2];
    const options = {stdio};
    try {
      require('child_process').execSync(command, options);
    } catch (exception) {
      console.warn(`\n\n[FAILED] %s\n\n`, command);
    }
  };

  runTest('./test-timers-linked-list.js');

})()

