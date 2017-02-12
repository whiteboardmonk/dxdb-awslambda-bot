'use strict';

const qs = require('querystring');
const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';
const lambda = new AWS.Lambda();

// Slack API token
let token = 'XXXXX';

exports.handler = (event, context, callback) => {
  // Issue with lambda callbacks
  // http://stackoverflow.com/questions/38570839/aws-lambda-function-never-calls-the-callback
  // http://stackoverflow.com/questions/37791258/lambda-timing-out-after-calling-callback?rq=1
  // https://gist.github.com/pahud/831329d0d5db76a8d6d7a363610d1ac4
  context.callbackWaitsForEmptyEventLoop = false;

  const done = (err, res) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? (err.message || err) : JSON.stringify({"response_type": "in_channel","text": res}),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const req_params = qs.parse(event.body);

  var lambda_params = {
    FunctionName: 'dxdbDelayedSlackResponse', // the lambda function we are going to invoke
    InvocationType: 'Event', // Invocation type async
    Payload: JSON.stringify(event)
  };

  if (token && req_params.token && req_params.token == token) {
    console.log('Request: lambda.invoke');
    lambda.invoke(lambda_params, function(err, data) {
      if (err) {
        console.log('Error:' + JSON.stringify(err));
        done(err);
      } else {
        console.log('Success: lambda.invoke');
        done(null, 'mssql> ' + req_params.text);
      }
    });

  } else {
    done('Token has not been set or is invalid');
  }
};