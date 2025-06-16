#!/usr/bin/env node
// run with: node sequencehunt_server.js
// info page: http://localhost:8080/info
// correct values: http://localhost:8080/check?val0=4&val1=12&val2=77&val3=98&val4=35

import http from 'http';
import url from 'url';

const TimingAttackProtectionSeconds = 0.025;
const SleepTiming = 0.15; // seconds

var IOLoopCounter = 0;

// even loop blocking sleep
function sleep(s) {
  var e = new Date().getTime() + s;
  while (new Date().getTime() <= e) { ; }
}

// check input, simulates algorithm vulnerable to timing attack
// for each correct value, additional delay of 0.45s is added.
function checkInput(params) {
  const correct = [4, 12, 77, 98, 35];

  // params into array
  const p = Object.keys(params).map(function (v) { return parseInt(params[v]); });

  console.log('working hard on our input ' + JSON.stringify(params));

  let result = true;
  let sleepTime = SleepTiming;

  console.log('DEBUG: Input values: ' + JSON.stringify(p));

  if (!(p.length <= correct.length)) result = false;

  for (let i = 0; i < p.length; i++) {
    if (p[i] == correct[i]) {
      sleepTime += SleepTiming;
    } else {
      result = false;
    }
  }

  sleep(sleepTime * 1000);

  return result;
}

http.createServer(
  /**
   * @param {import('http').ClientRequest} request 
   * @param {import('http').ServerResponse} response 
   * @returns 
   */
  function (request, response) {
    var u = url.parse(request.url, true);

    if (u.path.indexOf('/info') == 0) {
      IOLoopCounter++;
      response.writeHeader(200, { 'Content-Type': 'text/html' });
      response.write('IOLoop: ' + IOLoopCounter);
      response.end();

    } else if (u.path.indexOf('/check') == 0) {
      IOLoopCounter++;
      var start = new Date().getTime();
      // check if the input valus are correct (algorithm is time sensitive to the input)
      let result;

      try {
        result = checkInput(u.query);
      } catch (e) {
        console.error('Error while checking input: ' + e.message);
        response.writeHead(500, { 'Content-Type': 'text/plain' });
        // response.write(500, { 'Content-Type': 'text/plain' });
        response.write('Internal Server Error');
        response.end();
        return;
      }

      var secondsSpent = ((new Date().getTime()) - start) / 1000.0;

      // "prevent" the timing attack. wait until 3 seconds pass
      var timeLeftToWait = TimingAttackProtectionSeconds - secondsSpent;

      setTimeout(function () {
        if (result) {
          response.writeHeader(200, { 'Content-Type': 'text/html' });
          response.write('Congratulations, here is your price:</br>32C3_round_and_round_and_round_IT_goes</br>');
        } else {
          response.writeHeader(501, { 'Content-Type': 'text/html' });
          response.write('At least one value is wrong!</br>');
        }
        response.end();
        console.log('DEBUG: Blocked IO loop for: ' + secondsSpent.toFixed(2) + 's');
        console.log('DEBUG: Total request time: ' + TimingAttackProtectionSeconds + 's');
      }, timeLeftToWait * 1000);

    }
  }
).listen(8080);

console.log('Server running at http://localhost:8080/');
