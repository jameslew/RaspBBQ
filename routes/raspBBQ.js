var IO = require('./mcp3424_nodejs_adc.js');


var A = 2.4723753e-4,
    B = 2.3402251e-4,
    C = 1.3879768e-7,    // A,B,C are Steinhart-Hart coefficients
    R1 = 510e3,          // Resistor used in voltage divider
    RL = 9e16,//2.25e6,  // input impedence of mcp3424 (2.25e6) set large to ignore effect of RL
    Vi = 3.3,            // voltage applied to voltage divider
    ADCResolution = 3;   // resolution of ADC (0=12 bit, 1=14 bit, 2=16 bit, 3=18 bit)

// Steinhart-Hart for various probes
//2.4723753e-4, 2.3402251e-4, 1.3879768e-7  // Maverick ET-72/73
//5.36924e-4,1.91396e-4,6.60399e-8 // Maverick ET-732 (Honeywell R-T Curve 4)
//8.98053228e-4,2.49263324e-4,2.04047542e-7 // Radio Shack 10k
//1.14061e-3,2.32134e-4,9.63666e-8 // Vishay 10k NTCLE203E3103FB0

var bbq = {
    readTemp: function (channel, callback) {
        // get voltage
        var v = IO.getVoltage(channel, ADCResolution);
        
        // calculate probe resistance from measured voltage
        var Rp = 1 / ((Vi - v) / (R1 * v) - (1 / RL));

        // Convert probe resistance to Temp (Kelvin) via Steinhart-Hart
        var Tk = 1 / (A + B * Math.log(Rp) + C * Math.pow(Math.log(Rp), 3));

        // convert to Fahrenheit
        var Tf = (Tk - 273.15) * 9 / 5 + 32;

        //console.log('Channel(' + channel + ') v: ' + v + '  Rp: ' + Rp + '    Tk: ' + Tk + '      Tf: ' + Tf);

        callback(null, Tf);
    }
}

module.exports=bbq;
