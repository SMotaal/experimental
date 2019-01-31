| browser |    regexp     | method |       time       |
| :-----: | :-----------: | :----: | :--------------: |
| Chrome  |   `/\)\|/`    | `exec` |  6.9599609375ms  |
| Chrome  | `/\)(?=\|)/`  | `exec` |  5.283203125ms   |
| Chrome  | `/(?=\)\|)./` | `exec` | 4.844970703125ms |
| Chrome  | `/(?=\)\|)/`  | `exec` | 4.688232421875ms |
| Chrome  |   `/\)\|/`    | `exec` | 6.59814453125ms  |
| Chrome  | `/\)(?=\|)/`  | `exec` |   4.62109375ms   |
| Chrome  | `/(?=\)\|)./` | `exec` | 4.68994140625ms  |
| Chrome  | `/(?=\)\|)/`  | `exec` |   4.8359375ms    |

---

| browser |    regexp     | method |  time   |
| :-----: | :-----------: | :----: | :-----: |
|  Node   |   `/\)\|/`    | `exec` | 8.646ms |
|  Node   | `/\)(?=\|)/`  | `exec` | 5.650ms |
|  Node   | `/(?=\)\|)./` | `exec` | 4.682ms |
|  Node   | `/(?=\)\|)/`  | `exec` | 5.942ms |
|  Node   |   `/\)\|/`    | `exec` | 6.463ms |
|  Node   | `/\)(?=\|)/`  | `exec` | 4.846ms |
|  Node   | `/(?=\)\|)./` | `exec` | 5.768ms |
|  Node   | `/(?=\)\|)/`  | `exec` | 5.111ms |

---

| browser |    regexp     | method |   time   |
| :-----: | :-----------: | :----: | :------: |
| Safari  |   `/\)\|/`    | `exec` | 11.622ms |
| Safari  | `/\)(?=\|)/`  | `exec` | 11.758ms |
| Safari  | `/(?=\)\|)./` | `exec` | 14.693ms |
| Safari  | `/(?=\)\|)/`  | `exec` | 11.157ms |
| Safari  |   `/\)\|/`    | `exec` | 9.926ms  |
| Safari  | `/\)(?=\|)/`  | `exec` | 9.450ms  |
| Safari  | `/(?=\)\|)./` | `exec` | 13.013ms |
| Safari  | `/(?=\)\|)/`  | `exec` | 10.045ms |

---

| browser |    regexp     | method | time  |
| :-----: | :-----------: | :----: | :---: |
| Firefox |   `/\)\|/`    | `exec` |  6ms  |
| Firefox | `/\)(?=\|)/`  | `exec` |  5ms  |
| Firefox | `/(?=\)\|)./` | `exec` |  4ms  |
| Firefox | `/(?=\)\|)/`  | `exec` |  5ms  |
| Firefox |   `/\)\|/`    | `exec` |  6ms  |
| Firefox | `/\)(?=\|)/`  | `exec` |  5ms  |
| Firefox | `/(?=\)\|)./` | `exec` |  4ms  |
| Firefox | `/(?=\)\|)/`  | `exec` |  4ms  |

---

| browser |    regexp     |      method       |       time       |
| :-----: | :-----------: | :---------------: | :--------------: |
| Chrome  |   `/\)\|/`    | `[Symbol.search]` | 6.98681640625ms  |
| Chrome  | `/\)(?=\|)/`  | `[Symbol.search]` | 4.552001953125ms |
| Chrome  | `/(?=\)\|)./` | `[Symbol.search]` | 5.030029296875ms |
| Chrome  | `/(?=\)\|)/`  | `[Symbol.search]` | 4.72802734375ms  |
| Chrome  |   `/\)\|/`    | `[Symbol.search]` | 6.81494140625ms  |
| Chrome  | `/\)(?=\|)/`  | `[Symbol.search]` | 5.244873046875ms |
| Chrome  | `/(?=\)\|)./` | `[Symbol.search]` | 4.987060546875ms |
| Chrome  | `/(?=\)\|)/`  | `[Symbol.search]` | 4.64697265625ms  |

---

| browser |    regexp     |      method       |  time   |
| :-----: | :-----------: | :---------------: | :-----: |
|  Node   |   `/\)\|/`    | `[Symbol.search]` | 6.759ms |
|  Node   | `/\)(?=\|)/`  | `[Symbol.search]` | 4.750ms |
|  Node   | `/(?=\)\|)./` | `[Symbol.search]` | 4.453ms |
|  Node   | `/(?=\)\|)/`  | `[Symbol.search]` | 4.824ms |
|  Node   |   `/\)\|/`    | `[Symbol.search]` | 6.717ms |
|  Node   | `/\)(?=\|)/`  | `[Symbol.search]` | 4.346ms |
|  Node   | `/(?=\)\|)./` | `[Symbol.search]` | 4.808ms |
|  Node   | `/(?=\)\|)/`  | `[Symbol.search]` | 4.830ms |

---

| browser |    regexp     |      method       |   time   |
| :-----: | :-----------: | :---------------: | :------: |
| Safari  |   `/\)\|/`    | `[Symbol.search]` | 12.410ms |
| Safari  | `/\)(?=\|)/`  | `[Symbol.search]` | 14.328ms |
| Safari  | `/(?=\)\|)./` | `[Symbol.search]` | 13.624ms |
| Safari  | `/(?=\)\|)/`  | `[Symbol.search]` | 11.330ms |
| Safari  |   `/\)\|/`    | `[Symbol.search]` | 8.585ms  |
| Safari  | `/\)(?=\|)/`  | `[Symbol.search]` | 10.328ms |
| Safari  | `/(?=\)\|)./` | `[Symbol.search]` | 12.637ms |
| Safari  | `/(?=\)\|)/`  | `[Symbol.search]` | 10.953ms |

---

| browser |    regexp     |      method       | time  |
| :-----: | :-----------: | :---------------: | :---: |
| Firefox |   `/\)\|/`    | `[Symbol.search]` |  6ms  |
| Firefox | `/\)(?=\|)/`  | `[Symbol.search]` |  4ms  |
| Firefox | `/(?=\)\|)./` | `[Symbol.search]` | 20ms  |
| Firefox | `/(?=\)\|)/`  | `[Symbol.search]` |  5ms  |
| Firefox |   `/\)\|/`    | `[Symbol.search]` |  4ms  |
| Firefox | `/\)(?=\|)/`  | `[Symbol.search]` |  5ms  |
| Firefox | `/(?=\)\|)./` | `[Symbol.search]` |  5ms  |
| Firefox | `/(?=\)\|)/`  | `[Symbol.search]` |  5ms  |
