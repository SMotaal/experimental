# Hacking HackMD

## Linking to Raw Markdown

```js
(async documentId => {
    const record = {};
    record.documentId = documentId;
    try {
        // https://hackmd.io/rP78Ok0KRz24sDGSGZI0LQ
        record.baseURL = `https://hackmd.io/${record.documentId}`;

        // https://hackmd.io/rP78Ok0KRz24sDGSGZI0LQ/download
        record.sourceURL = `${record.baseURL}/download`

        ({content: record.sourceText} = await (await fetch (record.sourceURL)).text());
    } catch (exception) {
        record.error = exception;
    }
    return record;
})('rP78Ok0KRz24sDGSGZI0LQ')
```

## Accessing Revisions

```js
(async documentId => {
    const record = {};
    record.documentId = documentId;
    try {
        // https://hackmd.io/rP78Ok0KRz24sDGSGZI0LQ
        record.baseURL = `https://hackmd.io/${record.documentId}`;

        // https://hackmd.io/rP78Ok0KRz24sDGSGZI0LQ/download
        record.sourceURL = `${record.baseURL}/download`

        // https://hackmd.io/rP78Ok0KRz24sDGSGZI0LQ/revision
        record.revisionURL = `${record.baseURL}/revision`;

        ({
            revision: record.revisions,
            revision: [record.revision],
            revision: [{time:record.revisionId}]
        } = await (await fetch (record.revisionURL)).json());

        // https://hackmd.io/rP78Ok0KRz24sDGSGZI0LQ/1582984841407
        record.revisionURL = `${record.baseURL}/${record.revisionId}`;

        ({content: record.sourceText} = await (await fetch (record.sourceURL)).text());
    } catch (exception) {
        record.error = exception;
    }
    return record;
})('rP78Ok0KRz24sDGSGZI0LQ')
```
