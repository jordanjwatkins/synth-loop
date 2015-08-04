'use strict';

var dom = require('./dom.js'),
    knote = require('./knote.js');

var sounds = [],
    currentBeat = 0,
    beatDuration = 0.25,
    currentLoop = 0,
    maxLoops = 50,
    beatCount = 8,
    nextBeatTime,
    noteConfig,
    startTime,
    notes,
    elLoop;

function synthLoop(config) {
    elLoop = config.elLoop;
    noteConfig = config.noteConfig;
    notes = knote.noteRange(config.firstNote, config.noteCount, false).reverse();
    beatCount = config.beatCount || beatCount;
    maxLoops = config.maxLoops || maxLoops;

    makeSounds();
    render();
    addListeners();
}

function loop() {
    setTimes();

    if (shouldUpdate()) {
        queueBeatSounds();
        queueBeatVisuals();
    }

    setTimeout(function () {
        if (currentLoop < maxLoops) {
            loop();
        }
    }, 10);
}

function setTimes() {
    startTime = startTime || knote.audioContext.currentTime;
    nextBeatTime = startTime + currentBeat * beatDuration + (currentLoop * beatDuration * beatCount);
}

function shouldUpdate() {
    if (knote.audioContext.currentTime > nextBeatTime) {
        return true;
    }
}

function queueBeatSounds() {
    var i;

    noteConfig.start = nextBeatTime;
    noteConfig.duration = beatDuration;

    for (i = 0; i < sounds.length; i++) {
        queueBeatSound(sounds[i][currentBeat]);
    }

    currentBeat++;

    if (currentBeat === beatCount) {
        currentBeat = 0;
        currentLoop++;
    }
}

function queueBeatSound(beat) {
    if (beat.active) {
        knote.playNote(beat.note, noteConfig);
    }
}

function queueBeatVisuals() {
    var currentBeatEls = dom.find('.synth-loop__beat-' + (currentBeat + 1));

    setTimeout(function () {
        dom.each(currentBeatEls, function (el) {
            var currentClass = el.classList.contains('loop-1') ? 'loop-2' : 'loop-1';

            el.classList.remove('loop-1');
            el.classList.remove('loop-2');

            setTimeout(function () {
                el.classList.add(currentClass);
            }, 0);
        });
    }, nextBeatTime);
}

function makeSounds() {
    var sound,
        i;

    for (i = 0; i < notes.length; i++) {
        sound = makeBeats(i);
        sounds.push(sound);
    }

    return sounds;
}

function makeBeats(noteIndex) {
    var beats = [],
        i;

    for (i = 0; i < beatCount; i++) {
        beats.push(makeBeat(noteIndex));
    }

    return beats;
}

function makeBeat(noteIndex) {
    return {
        active: false,
        note: notes[noteIndex]
    };
}

function addListeners() {
    var i;

    for (i = 1; i <= notes.length; i++) {
        addBeatListeners(i);
    }

    addInitListener();
}

function addInitListener() {
    var tapCallback = dom.onTap(elLoop, initLoop);

    function initLoop() {
        knote.playNote({frequency: 0});
        loop();
        elLoop.classList.add('started');
        dom.offTap(elLoop, tapCallback);
    }
}

function addBeatListeners(parentIndex) {
    var i;

    for (i = 1; i <= beatCount; i++) {
        dom.onTap(dom.find('.synth-loop__sound-' + parentIndex + ' .synth-loop__beat-' + i), toggleBeatSound(parentIndex, i));
    }
}

function toggleBeatSound(soundIndex, beatIndex) {
    return function (e) {
        var beat = sounds[soundIndex - 1][beatIndex - 1];

        if (e.currentTarget.classList.toggle('active')) {
            beat.active = true;
        } else {
            beat.active = false;
        }
    };
}

function render() {
    var soundsHtml = [],
        i;

    for (i = 1; i <= notes.length; i++) {
        soundsHtml.push('<div class="synth-loop__sound synth-loop__sound-' + i + '">');
        soundsHtml.push(makeBeatEls());
        soundsHtml.push('</div>');
    }

    elLoop.innerHTML = soundsHtml.join('');
}

function makeBeatEls() {
    var beatEls = [],
        i;

    for (i = 1; i <= beatCount; i++) {
        beatEls.push('<div class="synth-loop__beat synth-loop__beat-' + i + ' loop-2"><div></div></div>');
    }

    return beatEls.join('');
}

module.exports = synthLoop;
