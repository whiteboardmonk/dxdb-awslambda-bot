'use strict';

const qs = require('querystring');
const SQL = require('mssql');
const request = require('request');
const Table = require('easy-table');
var start, finish;

// Slack API token
let token = 'XXXXX';

function sendDataToSlack(response_url, data, callback) {
  console.log('sendDataToSlack: ' + response_url);
  console.log('sendDataToSlack: ' + JSON.stringify(data));
  request({
    url: response_url,
    method: "POST",
    json: true,
    headers: {
      "content-type": "application/json",
    },
    body: data
  }, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      if(callback) callback(body);
    } else {
      console.log("Error: " + error);
      console.log("response.statusCode: " + response.statusCode);
      console.log("response.statusText: " + response.statusText);
    }
  });
}

function processEvent(event, done) {
  const params = qs.parse(event.body);
  const channel = params.channel_name;
  const commandText = params.text;
  const response_url = params.response_url;

  let db_name = '';
  if (commandText.match(/Foundation\./i)) {
    db_name = 'DeltaXCore';
  } else if (commandText.match(/Agency(\d+)\./i)) {
    let agency_id = commandText.match(/Agency(\d+)\./i)[1];
    db_name = 'DeltaXBp' + agency_id;
  } else {
    console.error(`Unable to determine db ${params.user_name} invoked ${params.command} in ${channel} with the following text: ${commandText}`);
    //return done();
    sendDataToSlack(response_url, {
        "mrkdwn": true,
        "attachments": [{
          "text": `Unable to determine db from the query`,
          "color": "#ff0000"
        }],
        "response_type": "in_channel"
      });
    return;
  }

  if (commandText.match(/INSERT |UPDATE |DELETE |ALTER |DROP |CREATE /gi)) {
    console.error(`Only SELECT queries are currently supported: ${commandText}`);
    //return done();
    sendDataToSlack(response_url, {
        "mrkdwn": true,
        "attachments": [{
          "text": "Only SELECT queries are currently supported",
          "color": "#ff0000"
        }],
        "response_type": "in_channel"
      });
    return;
  }

  console.log('processEvent: before runQuery');

  var config = {
    user: 'XXXXX',
    password: 'XXXXX',
    server: 'XXXXX.windows.net',
    // When you connect to Azure SQL Database, you need these next options.  
    options: {
      encrypt: true,
      database: db_name
    }
  };

  start = new Date();
  SQL.connect(config, function(err) {
    if (err) {
      sendDataToSlack(response_url, {
          "mrkdwn": true,
          "attachments": [{
            "text": `Unable to connect to db. Failed with the following error message: ${err.message}`,
            "color": "#ff0000"
          }],
          "response_type": "in_channel"
        });
      return;
    }
    console.log('runQuery: SQL.connect');
    // create Request object
    var request = new SQL.Request();
    // query to the database and get the records
    request.query(commandText, function(err, recordset, affected) {
      if (err) {
        sendDataToSlack(response_url, {
            "mrkdwn": true,
            "attachments": [{
              "text": `Unable to connect to execute query. Failed with the following error message: ${err.message}`,
              "color": "#ff0000"
            }],
            "response_type": "in_channel"
          });
        return;
      }
      finish = new Date();
      var db_prompt = '';
      if (commandText.match(/Foundation\./i)) {
        db_prompt = 'DeltaXCore';
      } else if (commandText.match(/Agency(\d+)\./i)) {
        let agency_id = commandText.match(/Agency(\d+)\./i)[1];
        db_prompt = 'DeltaXBp' + agency_id;
      }
      
      sendDataToSlack(response_url, {
        "mrkdwn": true,
        "attachments": [{
          "text": db_prompt + " | Time taken: " + (finish.getTime() - start.getTime()) / 1000 + " secs | Rows: " + recordset.length,
          "fallback": db_prompt + " | Time taken: " + (finish.getTime() - start.getTime()) / 1000 + " secs | Rows: " + recordset.length,
          "color": "#00ff00"
        }],
        "response_type": "in_channel"
      });

      var response_text = recordset.length == 1 ? Table.print(recordset[0]) : Table.print(recordset);
      var data = {
        "mrkdwn": true,
        "response_type": "ephemeral",
        "text": "```" + response_text + "```",
        "fallback": "```" + response_text + "```"
      };
      sendDataToSlack(response_url, data, done);
    });
  });
}

exports.handler = (event, context, callback) => {
  // Issue with lambda callbacks
  // http://stackoverflow.com/questions/38570839/aws-lambda-function-never-calls-the-callback
  // http://stackoverflow.com/questions/37791258/lambda-timing-out-after-calling-callback?rq=1
  // https://gist.github.com/pahud/831329d0d5db76a8d6d7a363610d1ac4
  context.callbackWaitsForEmptyEventLoop = false;

  const done = (err, res) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? (err.message || err) : JSON.stringify(res),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const req_params = qs.parse(event.body);

  if (token && req_params.token && req_params.token == token) {
    processEvent(event, done, context);
  } else {
    done('Token has not been set.');
  }
};