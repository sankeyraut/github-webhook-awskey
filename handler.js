
//Message for updates
const crypto = require('crypto');
const request = require('request');
var AWS = require('aws-sdk');

function signRequestBody(key, body) {
  return `sha1=${crypto.createHmac('sha1', key).update(body, 'utf-8').digest('hex')}`;
}

module.exports.githubWebhookListener = (event, context, callback) => {
  var errMsg; // eslint-disable-line
  const token = process.env.GITHUB_WEBHOOK_SECRET;
  const snsarn = process.env.SNS_TOPIC;
  const headers = event.headers;
  const sig = headers['X-Hub-Signature'];
  const githubEvent = headers['X-GitHub-Event'];
  const id = headers['X-GitHub-Delivery'];
  const calculatedSig = signRequestBody(token, event.body);

  if (typeof token !== 'string') {
    errMsg = 'Must provide a \'GITHUB_WEBHOOK_SECRET\' env variable';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (!sig) {
    errMsg = 'No X-Hub-Signature found on request';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (!githubEvent) {
    errMsg = 'No X-Github-Event found on request';
    return callback(null, {
      statusCode: 422,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (!id) {
    errMsg = 'No X-Github-Delivery found on request';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  if (sig !== calculatedSig) {
    errMsg = 'X-Hub-Signature incorrect. Github webhook token doesn\'t match';
    return callback(null, {
      statusCode: 401,
      headers: { 'Content-Type': 'text/plain' },
      body: errMsg,
    });
  }

  /* eslint-disable */
  console.log('---------------------------------');
  console.log(`Github-Event: "${githubEvent}" with action: "${event.body.action}"`);
  console.log('---------------------------------');
  //console.log('Payload', event.body);
  /* eslint-enable */
  
  
  var unencoded = unescape(event.body);
  var eventJson = unencoded.substring(8,unencoded.length)
  var eventBody = JSON.parse(eventJson);

  for (i = 0; i < eventBody.commits.length; i++) { 

    var compareURL = eventBody.commits[i].url;
    request(compareURL, { json: false }, (err, res, body) => {
      if (err) { return console.log(err); }
      //console.log(body);
      var awskeyregex = new RegExp("AKIA[0-9A-Z]{16}");
      //var awssecretregex = new RegExp("[0-9a-zA-Z/+]{40}");

      if(awskeyregex.test(body))
      {
        var message = 'AWS key found in public repository. Details are in URL : '+compareURL+' Please take immediate action'

        var params = {
            Message: message, /* required */
            TopicArn: snsarn
        };
        var publishTextPromise = new AWS.SNS().publish(params).promise();
        publishTextPromise.then(
            function(data) {
                  console.log(`Message ${params.Message} send sent to the topic ${params.TopicArn}`);
                  console.log("MessageID is " + data.MessageId);
        }).catch(
            function(err) {
                console.error(err, err.stack);
        });

        
      }
     

  });

  }


  
  
  // Do custom stuff here with github event data
  // For more on events see https://developer.github.com/v3/activity/events/types/

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      input: event,
    }),
  };

  return callback(null, response);
};


module.exports.customAction = (event, context, callback) => {
  
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      input: event,
    }),
  };
  return callback(null, response);
};

