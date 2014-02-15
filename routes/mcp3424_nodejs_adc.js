//***************************************************************
// The Chair - voltage - I2C read from an attached ADC
//***************************************************************

// The "korevec/node-i2c" library (available on npm or via github)
var i2c = require('i2c');       
// Address of the ADC we want to access
var addressLeft = 0x68;
// Combination of channel=1, resolution=12, gain=0, mode=continuous
// 90=12 bits, 94=14, 98=16, and 9C=28 with all else constant
var command = 128 | 00 | 0 | 0 | 00 ;  //ready bit set, channel 1, single shot, 12 bit sample, 1x gain
// Instantiate our interface - device may differ by 'puter.   Use
// "i2cdetect -r -y 1" to find the right device
var wireLeft = new i2c(addressLeft, {device: '/dev/i2c-1', debug:false}); 

var leftVoltage = 0;

var spin = function (delayMs) {
    var s = new Date().getTime();
    while ((new Date().getTime() - s) < delayMs) {
        //do nothing
        //console.log('sleeping');
    }
}

var ADC12Bit = 0, ADC14Bit = 1, ADC16Bit = 2, ADC18Bit = 3;

exports.getVoltage = function(channel, resolution) {
    //var resolution = ADC16Bit;
    var command = 128 + (channel << 5) + (resolution << 2);

    wireLeft.writeByte(command, function(err) {
	if (err)
            console.log('write err: ' + err);
    });

    // wait for data to be ready
    if (resolution == ADC12Bit)
        spin(1000 / 240);
    else if (resolution == ADC14Bit)
        spin(1000 / 60);
    else if (resolution == ADC16Bit)
        spin(1000 / 15);
    else
        spin(1000 / 3.75);

    return voltage(wireLeft.readBytes(command, 4, function (err, res) {
        if (err)
            console.log('left probe read error: ' + err);
       // console.log('reading channel: ' + channel + '  command: ' + command + '  res: ' + res.toString('hex'));
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
            divisor = Math.pow(2, 17);
    } else if ((command & 8) == 8) { //16 bit
    //        console.log("16 bit resolution");
            signBit = 0x8000;
            signExtend = 0xFFFF0000;
            divisor = Math.pow(2, 15);
    } else if ((command & 4) == 4) { // 14 bit
    //        console.log("14 bit resolution");
            signBit = 0x2000;
            signExtend = 0xFFFFC000;
            divisor = Math.pow(2, 13);
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

    /*console.log('buffer: ' + buffer.toString('hex'));
    console.log('signBit: ' + signBit.toString(2) + ' ' + signBit);
    console.log('signExtend: ' + signExtend.toString(2) + ' ' + signExtend);
    console.log('divisor: ' + divisor.toString(2) + ' ' + divisor);
    console.log('result1: ' + result.toString(2) + ' ' + result);
    */
    // Fill/blank remaining bits  
    if ((result & signBit) != 0)
        result |= signExtend; // Sign bit is set, sign-extend

    //console.log('result2: ' + result.toString(2) + ' ' + result);
    //console.log('result/divisor: ' + result/divisor);

    return (2.048 * (result / divisor));
    //return (5 / 2.1475 * (result / divisor));
}