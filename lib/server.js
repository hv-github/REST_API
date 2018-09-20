/*
Server-related tasks
*/

//Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');
var handlers = require('./handlers');
//var _data = require('./lib/data');
var helpers = require('./helpers');
var path = require('path');
var util = require('util');
var debug = util.debuglog('server');

//Instantiate the server module object
var server = {};

//@TODO GET RID OF THIS
/*
helpers.sendTwilioSms('4151234567', 'Hello!', function(err){
  console.log('This was the error', err);
});
*/

//TESTING
// @TODO delete this
/*
_data.create('test', 'newFile', {'foo' : 'bar'}, function(err){
  console.log('This was the error', err);
});
*/

//READ TEST
/*
_data.read('test', 'newFile', function(err, data){
  console.log('This was the error ', err, ' and this was the data ', data);
});
*/

/*
_data.update('test', 'newFile', {'fizz':'buzz'}, function(err){
  console.log('This was the error ', err);
});
*/

/*
_data.delete('test', 'newFile', function(err){
  console.log('This was the error ', err);
});
*/

//Instantiate the HTTP server
// The server should respond to all requests with a string
server.httpServer = http.createServer(function(req, res){
  server.unifiedServer(req, res);

    // Send the response
    //res.end('Hello World\n');


    // Log the request path
    //console.log('Request received on path: ' + trimmedPath + 'with method' + method + ' with these query strings parameters' + queryStringObject);
    //console.log('Request received with these payload: ', buffer);


  // Log the request path
  //console.log('Request received on path: ' + trimmedPath + 'with method' + method + ' with these query strings parameters' + queryStringObject);
  //console.log('Request received with these headers: ', headers);
});




// Instantiate the HTTPS server
server.httpsServerOptions = {
    'key' : fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions, function(req,res){
  server.unifiedServer(req, res);
});




//All the server logic for both the http and https server
server.unifiedServer = function(req, res){
  // Get the URL and parse it
  var parsedUrl = url.parse(req.url, true);

  // Get the path
  var path = parsedUrl.pathname;
  var trimmedPath = path.replace(/^\/+|\/+$/g, '');

  // Get the query string as an object add ?X=Y returns {X: 'Y'}
  var queryStringObject = parsedUrl.query;

  // Get the HTTP Method
  var method = req.method.toLowerCase();

  //Get the headers as an object
  var headers = req.headers;

  // Get the payload (come in as stream of bits), if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';

  //req object emits data event
  req.on('data', function(data){
    buffer += decoder.write(data);
  });

  req.on('end', function(){
    buffer += decoder.end();

    //Choose the handler this request should go to. If one is not found, use the not found handler
    var chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    //Construct the data object to send to the handlers
    var data = {
      'trimmedPath' : trimmedPath,
      'queryStringObject' : queryStringObject,
      'method' : method,
      'headers' : headers,
      'payload' : helpers.parseJsonToObject(buffer)
    };

    //Route the request to the handler specified in the router
    chosenHandler(data, function(statusCode, payload){
      // Use the status code called back by the handler, or default to 200
      statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

      //Use the payload called back by the handler, or default to an empty objct
       payload = typeof(payload) == 'object' ? payload : {};

      // Convert the payload to a string
      var payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');

      res.writeHead(statusCode);

      res.end(payloadString);

      //If the response is 200, print green otherwise print red
      // If the response is 200, print green, otherwise print red
      if(statusCode == 200){
        debug('\x1b[32m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      } else {
        debug('\x1b[31m%s\x1b[0m',method.toUpperCase()+' /'+trimmedPath+' '+statusCode);
      }

    });

  });

};

/*
//Define the handlers
var handlers = {};

//Sample handlers
//handlers.sample = function(data, callback){
  // Callback a http status code, and a payload object
  //callback(406, {'name' : 'sample handler'})
//};

//Ping handlers
handlers.ping = function(data, callback){
  callback(200);
};

//Not found handler
handlers.notFound = function(data, callback){
  callback(404);
};
*/

// Define a request router
server.router = {
  //'sample' : handlers.sample
  'ping' : handlers.ping,
  'users': handlers.users,
  'tokens': handlers.tokens,
  'checks' : handlers.checks
};


//Init scipt
server.init = function(){
  // Start the server, and have it listen on port 3000
  server.httpServer.listen(config.httpPort, function(){
    console.log('\x1b[36m%s\x1b[0m',"The server is listening on port " + config.httpPort + " in" + config.envName + " mode");

  });

  // Start the HTTPS server
  server.httpsServer.listen(config.httpsPort, function(){
    console.log('\x1b[35m%s\x1b[0m',"The server is listening on port " + config.httpsPort + " in" + config.envName + " mode");

  });
};



//Export the server
module.exports = server;
