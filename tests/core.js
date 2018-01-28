var assert = require('assert');
var http = require('http');

http.get('http://localhost:4020/sproutcore/tests', (res) => {
  const statusCode = res.statusCode;
  const contentType = res.headers['content-type'];

  let error;
  if (statusCode !== 200) {
    error = new Error('Request Failed.\n' +
                      `Status Code: ${statusCode}`);
  }
  if (error) {
    console.log(error.message);
    // consume response data to free up memory
    res.resume();
    // return;
  }

  assert.equal(statusCode, 200, "Request failed for test runner");
}).on('error', (e) => {
  console.log(`Got error: ${e.message}`);
});