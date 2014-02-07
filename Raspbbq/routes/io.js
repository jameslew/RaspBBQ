var i2c = require('i2c');
 
var modes = {
        IODIRA:0x00, IODIRB:0x01,
        GPPUA:0x0C, GPPUB:0x0D,
        GPIOA:0x12, GPIOB:0x13};
 
function IO() {
  this.device = '/dev/i2c-1';
  this.address = 0x68;
  this.portAValue = null;
  this.portBValue = null;
}
 
IO.prototype.initialize = function() {
  this.i2cdev = new i2c(this.address, {device : this.device});
  this.setReg(modes.MODE1, 0xFF); // set port A to all inputs
  this.setReg(modes.MODE2, 0xFF); // set port B to all inputs
  this.setReg(modes.GPPUA, 0xFF); // enable pull-up resistors
  this.setReg(modes.GPPUB, 0xFF); // enable pull-up resistors
 }

IO.prototype.start = function() {
    this.intA = setInterval(this.readPortA, 250, this)
    this.intB = setInterval(this.readPortB, 250, this)
}

IO.prototype.readPortA = function (_this) {
    _this.i2cdev.readBytes(modes.GPIOA, 1, function (err, resA) {
        this.portAValue = resA;
    });
}

IO.prototype.readPortB = function (_this) {
    _this.i2cdev.readBytes(modes.GPIOB, 1, function (err, resB) {
        this.portBValue = resB;
    });
}

IO.prototype.getPortA = function (resA, portACallback) {
    portACallback(this.portAValue);
};

IO.prototype.getPortB = function (resB, portBCallback) {
    portBCallback(this.portBValue);
};

var getBit = function(number, bit) {
  return (number[0] & (1<<bit)) >> bit;
};
 
IO.prototype.setReg = function (reg, value) {
  this.i2cdev.writeBytes(reg, [value]);
}
 
IO.prototype.setMulti =  function(reg, values){
  this.i2cdev.writeBytes(reg | 0xe0, values);
}
 
module.exports = IO;
module.exports.modes = modes;


// *** FOR LATER

//var sqlite3 = require('sqlite3').verbose();


//var db = new sqlite3.Database('security.db');

//db.run("create table if not exists Log (id INTEGER primary key, Timestamp TEXT, SensorId int, Value int);");


var insert = function (port, value) {
    var now = new Date();
    var sql = "Insert into Log Values(null,'" + now.toISOString() + "'," + port + "," + value + ");"

    //    db.exec(sql, function (err) {
    //            if (err)
    //                console.log("Sql error executing statement: " + sql + " err: " + err);
    // else
    //   console.log("Sql successfully inserted " + cnt + " keywords");    
    //        });
}