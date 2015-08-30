/**
 * Module dependencies.
 */
// lalala
var express = require('express');
//var routes = require('./routes');
var http = require('http');
var path = require('path');
var raspBBQ = require('./routes/raspBBQ.js');
var LCDPLATE = require('adafruit-i2c-lcd').plate;
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var serveStatic = require('serve-static');
var methodOverride = require('method-override');
var sleep = require('sleep');
var errorHandler = require('errorhandler');
var app = express();
var lcd = new LCDPLATE('/dev/i2c-1', 0x20);
var netUtils = require('./utils.js');
var RunLog = [];
var request = require('request');

lcd.backlight(lcd.colors.RED);

netUtils.getNetworkIPs(function (error, ip) {
    console.log("ip: " + ip);
    lcd.message("RaspBBQ 1.1\n" + ip);
    
    if (error) {
        console.log('error:', error);
    }
}, false);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(serveStatic(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

var targetFood, targetPit, maxPit, minPit, probeTimer;

//app.get('/', routes.index);

//app.get('/bbqInit/:targetFood/:targetPit/:maxPit/:minPit', function (req, res) {
    
//    console.log(req.params);
    
//    var targetFood = req.params.targetFood;
//    var targetPit = req.params.targetPit;
//    var maxPit = req.params.maxPit;
//    var minPit = req.params.minPit;
    
probeTimer = setInterval(function () {
        
    var Probe1Temp, pitProbeTempF = 0.0;
    var Probe2Temp, foodProbeTempF = 0.0;
    var Probe3Temp, probe3TempF = 0.0;
    var Probe4Temp, probe4TempF = 0.0;
        
    raspBBQ.readTemp(0, function (err, pitProbeTempF) {
        pitProbeVal = pitProbeTempF;
    });
        
    raspBBQ.readTemp(1, function (err, foodProbeTempF) {
        foodProbeVal = foodProbeTempF;
    });
        
    raspBBQ.readTemp(2, function (err, probe3TempF) {
        probe3Val = probe3TempF;
    });
        
    raspBBQ.readTemp(3, function (err, probe4TempF) {
        probe4Val = probe4TempF;
    });
        
    //keep the list at 250 items, we don't need that much history.
    while (RunLog.length > 249) {
        RunLog.shift();
    }
        
    RunLog.push({ pitProbe: pitProbeVal, foodProbe: foodProbeVal, probe3Temp: probe3Val, probe4Temp: probe4Val, timestamp: Date.now() });
    //request({
    //    uri: 'http://grovestreams.com:80/api/feed?api_key=0b606c5f-966b-320b-befa-3b8a3a237618&compid=bbqPit&pitProbe=' + Math.round(pitProbeVal * 100) / 100 + '&foodProbe=' + Math.round(foodProbeVal * 100) / 100,
    //    method: 'PUT'
    //    }
    //    , function (error, response, body) {
    //    console.log(body);
    //});
    request({
        uri: 'https://graph.api.smartthings.com/api/smartapps/installations/a31a02af-8663-4049-9ea1-13f3e8462014/updateTemps/'+ Math.round(pitProbeVal * 100) / 100 + '/'+ Math.round(foodProbeVal * 100) / 100+'?access_token=2b2de1d4-c500-4c78-ae5a-2ef9ef4b866b',  
        method: 'PUT'
    }
    , function (error, response, body) {
        console.log(body);
    });
    lcd.home();
    lcd.clear();
    lcd.message('Pit: ' + Math.round(pitProbeVal * 100) / 100 + '\nFood: ' + Math.round(foodProbeVal * 100) / 100);
    console.log(RunLog.length);

}, 1000 * 60);
    
//res.send([{}]);

//});

app.get('/bbqDump', function (req, res) {
    
    res.send([RunLog]);

});

app.get('/bbqTemps', function (req, res) {
    
    if (RunLog.length != 0) {
        var lastBbqTemps = RunLog[RunLog.length - 1];
        //        console.log (lastBbqTemps);
        //        console.log('Pit: ' + lastBbqTemps.pitProbe + 'Food: ' + lastBbqTemps.foodProbe);
        
        res.send([{ pitProbe: lastBbqTemps.pitProbe }, { foodProbe: lastBbqTemps.foodProbe }, { probe3: lastBbqTemps.probe3Temp }, { probe4: lastBbqTemps.probe4Temp }]);
    } else res.send([{ pitProbe: 0 }, { foodProbe: 0 }, { probe3: 0 }, { probe4: 0 }]);

});

// expected commandline node.js script CLIENT_ID CLIENT_SECRET
if (process.argv.length != 4) {
    console.log("usage: " + process.argv[0] + " " + process.argv[1] + " CLIENT_ID CLIENT_SECRET");
    process.exit();
}

// testing
//id: 6a8b262f-b5b6-4978-b304-85b972bebc63
//secret: b27468b4-f014-446f-982c-0c886f8445e1

var CLIENT_ID = process.argv[2];
var CLIENT_SECRET = process.argv[3];

var endpoints_uri = 'https://graph.api.smartthings.com/api/smartapps/endpoints';

var oauth2 = require('simple-oauth2')({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    site: 'https://graph.api.smartthings.com'
});

// Authorization uri definition 
var authorization_uri = oauth2.authCode.authorizeURL({
    redirect_uri: 'http://localhost:3000/callback',
    scope: 'app',
    state: '3(#0/!~'
});

// Initial page redirecting to Github 
app.get('/auth', function (req, res) {
    res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token 
app.get('/callback', function (req, res) {
    var code = req.query.code;
    // console.log('/callback got code' + code);
    oauth2.authCode.getToken({
        code: code,
        redirect_uri: 'http://localhost:3000/callback'
    }, saveToken);
    
    function saveToken(error, result) {
        if (error) { console.log('Access Token Error', error.message); }
        
        // result.access_token is the token, get the endpoint
        var bearer = result.access_token
        var sendreq = { method: "GET", uri: endpoints_uri + "?access_token=" + result.access_token };
        request(sendreq, function (err, res1, body) {
            var endpoints = JSON.parse(body);
            // we just show the final access URL and Bearer code
            var access_url = endpoints[0].url
            res.send('<pre>https://graph.api.smartthings.com/' + access_url + '</pre><br><pre>Bearer ' + bearer + '</pre>');
        });
    }
});

app.get('/', function (req, res) {
    res.send('<a href="/auth">Connect with SmartThings</a>');
});


http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
