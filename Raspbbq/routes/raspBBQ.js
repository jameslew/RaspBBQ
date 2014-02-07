var IO = require('./mcp3424_nodejs_adc.js');

var bbq = {
    foodProbeGet : function (foodProbeCallback) {

	    var rightProbeTemp; // = 225; 
        var err=0;
      
        rightProbeVoltage = (IO.getRightVoltage()) * 1000;
        rightProbeTemp =  -67.62 * Math.log(rightProbeVoltage) + 545.79;
//        console.log("Food Probe Voltage: " + rightProbeVoltage + " Food Probe Temp: " + rightProbeTemp);

        foodProbeCallback(err, rightProbeTemp, rightProbeVoltage);
    },

    pitProbeGet : function (pitProbeCallback) {

	    var leftProbeTemp; // = 165; 
        var err=0;

        leftProbeVoltage = (IO.getLeftVoltage()) * 1000;
        leftProbeTemp = -73.82 * Math.log(leftProbeVoltage) + 577.98;
//        console.log("Pit Probe Voltage: " + leftProbeVoltage + " Pit Probe Temp: " + leftProbeTemp);

        pitProbeCallback(err, leftProbeTemp, leftProbeVoltage);
    }
}

module.exports=bbq;
