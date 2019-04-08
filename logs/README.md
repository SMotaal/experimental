# Experimental Logs

## GitHub

### Getting Commit Data

```js
(async ({
  since = '2019-03-12',
  offset,
  projects = {
    'Console': { repo 'Smotaal/console'},
  },
} = {}) => {
  //* SEE: https://developer.github.com/v3/repos/commits/
  const REPOS = `https://api.github.com/repos`;

  const TIMEZONE = `${0 - new Date().getTimezoneOffset() / 60}`.replace(/^(-)?(\d+)(?:.(\d+)|)$/, (m, sg, hr, mv) => `${sg || '+'}${hr.padStart(2, '0')}${mv ? `:${mv * 60}` : ''}`);

  const [SINCE, UNTIL] = ((
    { date = new Date(), days = -7, day = 5 } = {},
    {
      remap = (value, ...mappers) => mappers.reduce((v, r) => v.map(r), value),
      format = date => new Date(date).toISOString(),
      alias = value => (value.setHours(24 * ((value.getHours() - 12) % 12 > 0), 0, 0, 0), value),
      relative = (date, days) => ((date = new Date(date)), 0 + days && date.setDate(date.getDate() + days), date),
      nearest = (value = new Date(), { ends = 5, day = value.getDay(), date = value.getDate() } = {}) => (
        value.setDate(date - day + ends + (7 * day > ends)), value
      ),
      range = (...dates) =>
        dates.length === 1 ? [dates[0], dates[0]] : dates.length ? [dates.sort()[0], dates[1]] : dates,
    } = {},
  ) => remap(range(nearest(date, { ends: day }), relative(date, days)), alias, format))();

  const query = `?since=${SINCE}&until=${UNTIL}`;

  for (const { repo } of projects) {
    const commits = await (await fetch(`${REPOS}/${repo}/commits?`))
  }

})()
```
