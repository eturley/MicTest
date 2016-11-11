navigator.getUserMedia = ( navigator.getUserMedia ||
    	                       navigator.webkitGetUserMedia ||
    	                       navigator.mozGetUserMedia ||
    	                       navigator.msGetUserMedia);

window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function(callback, element){
            window.setTimeout(callback, 1000 / 60);
          };
})();

window.AudioContext = (function(){
    return  window.webkitAudioContext || window.AudioContext || window.mozAudioContext;
})();

// Global Variables for Audio
var audioContext;
var analyserNode;
var javascriptNode;
var sampleSize = 1024;  // number of samples to collect before analyzing
                        // decreasing this gives a faster sonogram, increasing it slows it down
var amplitudeArray;     // array to hold frequency data
var audioStream;

	// Global Variables for Drawing
var column = 0;
var canvasWidth  = 450;
var canvasHeight = 256;
var ctx;

var counter = 0; //counter to see how often threshold is reached

$(document).ready(function() {
    ctx = $("#canvas").get()[0].getContext("2d");

    try {
        audioContext = new AudioContext();
    } catch(e) {
        alert('Web Audio API is not supported in this browser');
    }

    // When the Start button is clicked, finish setting up the audio nodes, and start
    // processing audio streaming in from the input device
    $("#start_button").click(function(e) {
        e.preventDefault();
        clearCanvas();

        // get the input audio stream and set up the nodes
        try {
            navigator.getUserMedia(
              { video: false,
                audio: true},
              setupAudioNodes,
              onError);
        } catch (e) {
            alert('webkitGetUserMedia threw exception :' + e);
        }
    });

    // Stop the audio processing
    /*$("#stop_button").click(function(e) {
        e.preventDefault();
        javascriptNode.onaudioprocess = null;
        if(audioStream) audioStream.stop();
        if(sourceNode)  sourceNode.disconnect();
    });*/
	
});

function setupAudioNodes(stream) {
    // create the media stream from the audio input source (microphone)
    sourceNode = audioContext.createMediaStreamSource(stream);
    audioStream = stream;

    analyserNode   = audioContext.createAnalyser();
    javascriptNode = audioContext.createScriptProcessor(sampleSize, 1, 1);

    // Create the array for the data values
    amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);

    // setup the event handler that is triggered every time enough samples have been collected
    // trigger the audio analysis and draw one column in the display based on the results
    javascriptNode.onaudioprocess = function () {

        amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);
        analyserNode.getByteTimeDomainData(amplitudeArray);

        // draw one column of the display
        requestAnimFrame(drawTimeDomain);
    }

    // Now connect the nodes together
    // Do not connect source node to destination - to avoid feedback
    sourceNode.connect(analyserNode);
    analyserNode.connect(javascriptNode);
    javascriptNode.connect(audioContext.destination);
}

function onError(e) {
    console.log(e);
}

function drawTimeDomain() {
    var minValue = 9999999;
    var maxValue = 0;

    for (var i = 0; i < amplitudeArray.length; i++) {
        var value = amplitudeArray[i] / 256;
        if(value > maxValue) {
            maxValue = value;
        } else if(value < minValue) {
            minValue = value;
        }
    }

    var y_lo = canvasHeight - (canvasHeight * minValue) - 1;
    var y_hi = canvasHeight - (canvasHeight * maxValue) - 1;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(column,y_lo, 1, y_hi - y_lo);

    // loop around the canvas when we reach the end
    column += 1;

    /*if(column >= canvasWidth) {
        column = 0;
        clearCanvas();
    }*/

    //increments variable each time threshold is reached
    if (y_hi < 80){
    	counter++;
    }
    //Stops after 10 seconds (currentTime variable is ahead by 2 seconds)
    if(audioContext.currentTime > 12) {
    	passedTest();
    	javascriptNode.onaudioprocess = null;
        if(audioStream) audioStream.stop();
        if(sourceNode)  sourceNode.disconnect(); 
    }

}

function clearCanvas() {
    column = 0;
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#f00';
    var y = (canvasHeight / 2) + 0.5;
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth-1, y);
    ctx.stroke();
}

function passedTest() {
	if(counter > 10){
		alert("You successfully passed the microphone test!");
	}
	else{
		alert("Did not pass microphone test. Please try again.");
	}
}
