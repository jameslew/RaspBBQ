var http = require('http');
var raspbbq = require('./raspBBQ.js');

http.createServer(function(req,resp) {
	resp.writeHead(200, {"Content-Type": "text/plain"});
	resp.write("start");
//	var foo = "1";
	var foo = raspbbq.probeAValue();
	if(foo != null) {
		console.log(foo);
		resp.write(foo.toString());
	}
	else
	{		
		console.log("foo was null");
		resp.write("null");
	}

	resp.end();

	console.log("sample output to console");
}).listen(8080);

