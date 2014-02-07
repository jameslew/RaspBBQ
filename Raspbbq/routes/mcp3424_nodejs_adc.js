//***************************************************************
// The Chair - voltage - I2C read from an attached ADC
//***************************************************************

// The "korevec/node-i2c" library (available on npm or via github)
var i2c = require('i2c');       
// Address of the ADC we want to access
var addressLeft = 0x68;
var addressRight = 0x69;
// Combination of channel=1, resolution=12, gain=0, mode=continuous
// 90=12 bits, 94=14, 98=16, and 9C=28 with all else constant
var command = 128 | 00 | 0 | 0 | 00 ;  //ready bit set, channel 1, single shot, 12 bit sample, 1x gain
// Instantiate our interface - device may differ by 'puter.   Use
// "i2cdetect -r -y 1" to find the right device
var wireLeft = new i2c(addressLeft, {device: '/dev/i2c-1', debug:false}); 
var wireRight = new i2c(addressRight, {device: '/dev/i2c-1', debug:false});

var leftVoltage = 0;
var rightVoltage = 0;

exports.getLeftVoltage = function() {
    return voltage(wireLeft.readBytes(command, 4, function(err, res) {
         return res;
    }), command);
}

exports.getRightVoltage = function() {
    return voltage(wireRight.readBytes(command, 4, function(err, res) {
         return res;
    }), command);
}    

function voltage(buffer, command) {
    if ((buffer[3] & 0x0c) == 0x0c) {
        var dataBytes = 3;
    }
    else {
        dataBytes = 2;
    }

    var signBit = 0;    // Location of sign bit
    var signExtend = 0; // Bits to be set if sign is set
    var divisor = 0;    // Divisor for conversion
    
    if ((command & 12) == 12) {  //18 bit
            signBit = 0x20000;
            signExtend = 0xFFFC0000;
            divisor = Math.pow(2, 18);
    } else if ((command & 8) == 8) { //16 bit
    //        console.log("16 bit resolution");
            signBit = 0x8000;
            signExtend = 0xFFFF0000;
            divisor = Math.pow(2, 16);
    } else if ((command & 4) == 4) { // 14 bit
    //        console.log("14 bit resolution");
            signBit = 0x2000;
            signExtend = 0xFFFFC000;
            divisor = Math.pow(2, 14);
    } else { //12 bit
    //        console.log("12 bit resolution");
            signBit = 0x800;
            signExtend = 0xFFFFF000;
            divisor = Math.pow(2, 11);
    }

    var result = 0;
    for (var i = 0; i < dataBytes; ++i) {
        result <<= 8;
        result |= buffer[i];
    }

    // Fill/blank remaining bits  
    if ((result & signBit) != 0)
        result |= signExtend; // Sign bit is set, sign-extend

    return (5 / 2.1475 * (result / divisor));
}