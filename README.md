# Getting started

This is an internal utility actively being used and was build as a proof of concept to test drive AWS Lambda and `serverless` architecture.

Purpose:
As noted earlier, we have over 500 tenant databases. When it comes to querying the databases - it's pretty cumbersome to connect to them individually using SMSS and then run individual queries. When it comes to executing small queries to check data; it would be pretty useful to simply fire the query in the Slack channel and see the results. An unexpected consequence of using Slack is also that one can fire the query from the Slack mobile application as well and see the results on the go.

Features supported:
* Detect the DB to connect with intelligently from the schema
* Support delayed response. Some queries can take longer to execute while Slack for an immediate response has a window of 3 seconds.
* Formatting output to the extent possible
* Minimal error notifications

How it works?
![Slack command dxdb](https://d2q4nobwyhnvov.cloudfront.net/4d73adf4-6b4a-480c-9511-ec8918f5998e/vsokc2ztHywofVg/img/serverless-dxdbAWSlambda.png)

* Every invocation of the command makes a POST request to the AWS API Gateway with the command and the request text; in our case the query.
* The AWS API Gateway invokes the AWS lambda function `dxdbExecuteSQL` and passes the request params. Tip: The AWS API Gateway is probably the most underrated yet one of the most powerful and flexible services AWS has launched. Will explore this in the future.
* `dxdbExecuteSQL` function authenticates the request, does minimal checks on the kind of queries (in our case only read-only) and does two things.First formats the intermediate response in the form of MSSQL prompt to be sent back to Slack through the API gateway. Next invoke the `dxdbDelayedSlackResponse` lambda function.
* `dxdbDelayedSlackResponse` lambda function parses the query, identifies the tenant, fires the query, reads the results, formats the response and makes POST request back to Slack.
