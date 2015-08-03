;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./dom.js":2,"./synth-loop.js":5}],2:[function(require,module,exports){
'use strict';

function domReady(init) {
    document.addEventListener('DOMContentLoaded', init);
}

function find(selector) {
    return document.querySelectorAll(selector);
}

function findOne(selector) {
    return document.querySelectorAll(selector)[0];
}

function findId(selector) {
    return document.getElementById(selector);
}

function each(items, callback) {
    if (items[0]) {
        [].forEach.call(items, callback);
    } else {
        callback(items);
    }
}

function on(els, event, callback) {
    each(els, function (el) {
        if (el.addEventListener) {
            el.addEventListener(event, callback);
        }
    });
}

function off(els, event, callback) {
    each(els, function (el) {
        if (el.removeEventListener) {
            el.removeEventListener(event, callback);
        }
    });
}

function inArray(value, array) {
    return [].indexOf.call(array, value) > -1;
}

function onTap(els, callback) {
    var touched = false,
        tapCallback = handleTap(callback);

    on(els, 'click', tapCallback);
    on(els, 'touchstart', tapCallback);

    return tapCallback;

    function handleTap() {
        return function (e) {
            // prevent click event event if triggering event was touchstart
            if (e.type === 'touchstart') {
                e.preventDefault();
                touched = true;
            } else if (touched === true) {
                touched = false;
                return false;
            }

            callback(e);
        };
    }
}

function offTap(els, callback) {
    off(els, 'click', callback);
    off(els, 'touchstart', callback);
}

module.exports = {
    ready: domReady,
    find: find,
    findOne: findOne,
    findId: findId,
    each: each,
    on: on,
    off: off,
    inArray: inArray,
    onTap: onTap,
    offTap: offTap
};

},{}],3:[function(require,module,exports){
'use strict';

var dom = require('./dom.js'),
    app = require('./app.js');

dom.ready(init);

function init() {
    app();
}

},{"./app.js":1,"./dom.js":2}],4:[function(require,module,exports){
'use strict';

var AudioContext = window.AudioContext || window.webkitAudioContext,
    audioContext = new AudioContext(),
    semitoneMap = {
        A: 0,
        B: 2,
        C: 3,
        D: 5,
        E: 7,
        F: 8,
        G: 10
    };

function playNote(note, options) {
    var config = options || {},
        oscillator = audioContext.createOscillator(),
        gainNode = audioContext.createGain(),
        compressor = audioContext.createDynamicsCompressor(),

        gain = config.gain || 0.2,
        waveType = config.waveType || 'sine',

        duration = config.duration || 0.25,
        startTime = config.startTime || audioContext.currentTime,
        stopTime = startTime + duration,
        truncate = config.truncate || 0;

    oscillator.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(audioContext.destination);

    gainNode.gain.value = gain;

    // fade just before stop time to prevent pops
    gainNode.gain.setTargetAtTime(0, (stopTime - 0.06) - truncate, 0.01);

    oscillator.frequency.value = note.frequency;
    oscillator.type = waveType;

    oscillator.start(startTime);
    oscillator.stop(stopTime);
}

function makeNote(noteName) {
    var note = {},
        octaveIndex = (noteName.length === 3) ? 2 : 1;

    note.letter = noteName[0];
    note.octave = toInt(noteName[octaveIndex]);

    if (octaveIndex === 2) {
        note.accidental = noteName[1];
        note.accidentalOffset = (note.accidental === 'b') ? -1 : 1;
    }

    note.frequency = calculateNoteFrequency(note);

    note.name = noteName;

    return note;
}

function calculateNoteFrequency(note) {
    var semitoneOffset = semitoneMap[note.letter],
        defaultOctaveSemitones = 5 * 12,
        frequency;

    semitoneOffset += (note.accidentalOffset) ? note.accidentalOffset : 0;

    semitoneOffset += (note.octave * 12) - defaultOctaveSemitones;

    frequency = frequencyByOffset(440, semitoneOffset);

    return (isNaN(frequency)) ? 0 : frequency;
}

function frequencyByOffset(baseFrequency, semitoneOffset) {
    return baseFrequency * Math.pow(2, (semitoneOffset / 12));
}

function noteRange(firstNote, count, accidentals) {
    var notes = [],
        note = makeNote(firstNote),
        i;

    notes.push(note);

    count--;

    for (i = 0; i < count; i++) {
        note = nextNote(note, accidentals);
        notes.push(note);
    }

    return notes;
}

function noteNameRange(firstNote, count, accidentals) {
    var noteNames = [],
        note = makeNote(firstNote),
        i;

    noteNames.push(note.name);

    for (i = 0; i < count - 1; i++) {
        note = nextNote(note, accidentals);
        noteNames.push(note.name);
    }

    return noteNames;
}

function nextNote(note, accidentals) {
    var noteLetters = 'ABCDEFG'.split(''),
        letterIndex = noteLetters.indexOf(note.letter),
        octave = note.octave,
        letter;

    if (canHaveAccidental(note)) {
        letter = note.letter + '#';
    } else {
        letter = nextLetter(letterIndex);

        if (letter === 'A') {
            octave++;
        }
    }

    return makeNote(letter + octave);

    function nextLetter(currentIndex) {
        var index = currentIndex + 1;

        return (noteLetters[index]) ? noteLetters[index] : noteLetters[0];
    }

    function canHaveAccidental() {
        if (!accidentals) {
            return false;
        }

        if (note.accidental) {
            return false;
        }

        return (note.letter === 'B' || note.letter === 'E') ? false : true;
    }
}

function prevNote(note, accidentals) {
    var noteLetters = 'ABCDEFG'.split(''),
        letterIndex = noteLetters.indexOf(note.letter),
        octave = note.octave,
        letter;

    if (note.accidental && accidentals) {
        letter = note.letter;
    } else {
        letter = prevLetter(letterIndex);

        if (letter === 'G') {
            octave--;
        }
    }

    return makeNote(letter + octave);

    function prevLetter(currentIndex) {
        var index = currentIndex - 1;

        return (noteLetters[index]) ? noteLetters[index] : noteLetters[noteLetters.length - 1];
    }
}

function toInt(value) {
    return parseInt(value, 10);
}

module.exports = {
    audioContext: audioContext,
    playNote: playNote,
    noteRange: noteRange,
    noteNameRange: noteNameRange,
    makeNote: makeNote,
    nextNote: nextNote,
    prevNote: prevNote
};

},{}],5:[function(require,module,exports){
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
    var currentBeatEls;

    startTime = startTime || knote.audioContext.currentTime;

    nextBeatTime = startTime + currentBeat * beatDuration + (currentLoop * beatDuration * beatCount);

    if (shouldUpdate()) {
        currentBeatEls = dom.find('.synth-loop__beat-' + (currentBeat + 1));

        queueBeatSounds();

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

    setTimeout(function () {
        if (currentLoop < maxLoops) {
            loop();
        }
    }, 10);
}

function shouldUpdate() {
    if (knote.audioContext.currentTime > nextBeatTime) {
        return true;
    }
}

function queueBeatSounds() {
    var i;

    noteConfig.start = startTime + currentBeat * beatDuration + (currentLoop * beatDuration * beatCount);
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

},{"./dom.js":2,"./knote.js":4}]},{},[3])
;