'use strict';

var dom = require('./dom.js'),
    synthLoop = require('./synth-loop.js');

function synthApp() {
    var elApp = dom.findId('app'),
        synthConfig;

    elApp.innerHTML = '<div id="synth-loop-1" class="synth-loop"></div>';

    synthConfig = {
        elLoop: dom.findId('synth-loop-1'),
        firstNote: 'C4',
        noteCount: 11,
        noteConfig: {
            truncate: 0.013
        }
    };

    synthLoop(synthConfig);
}

module.exports = synthApp;
