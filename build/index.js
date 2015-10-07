(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./dom.js":2,"./knote.js":4}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvYXBwLmpzIiwic3JjL2pzL2RvbS5qcyIsInNyYy9qcy9pbmRleC5qcyIsInNyYy9qcy9rbm90ZS5qcyIsInNyYy9qcy9zeW50aC1sb29wLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBkb20gPSByZXF1aXJlKCcuL2RvbS5qcycpLFxuICAgIHN5bnRoTG9vcCA9IHJlcXVpcmUoJy4vc3ludGgtbG9vcC5qcycpO1xuXG5mdW5jdGlvbiBzeW50aEFwcCgpIHtcbiAgICB2YXIgZWxBcHAgPSBkb20uZmluZElkKCdhcHAnKSxcbiAgICAgICAgc3ludGhDb25maWc7XG5cbiAgICBlbEFwcC5pbm5lckhUTUwgPSAnPGRpdiBpZD1cInN5bnRoLWxvb3AtMVwiIGNsYXNzPVwic3ludGgtbG9vcFwiPjwvZGl2Pic7XG5cbiAgICBzeW50aENvbmZpZyA9IHtcbiAgICAgICAgZWxMb29wOiBkb20uZmluZElkKCdzeW50aC1sb29wLTEnKSxcbiAgICAgICAgZmlyc3ROb3RlOiAnQzQnLFxuICAgICAgICBub3RlQ291bnQ6IDExLFxuICAgICAgICBub3RlQ29uZmlnOiB7XG4gICAgICAgICAgICB0cnVuY2F0ZTogMC4wMTNcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBzeW50aExvb3Aoc3ludGhDb25maWcpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHN5bnRoQXBwO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBkb21SZWFkeShpbml0KSB7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGluaXQpO1xufVxuXG5mdW5jdGlvbiBmaW5kKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpO1xufVxuXG5mdW5jdGlvbiBmaW5kT25lKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IpWzBdO1xufVxuXG5mdW5jdGlvbiBmaW5kSWQoc2VsZWN0b3IpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoc2VsZWN0b3IpO1xufVxuXG5mdW5jdGlvbiBlYWNoKGl0ZW1zLCBjYWxsYmFjaykge1xuICAgIGlmIChpdGVtc1swXSkge1xuICAgICAgICBbXS5mb3JFYWNoLmNhbGwoaXRlbXMsIGNhbGxiYWNrKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjYWxsYmFjayhpdGVtcyk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBvbihlbHMsIGV2ZW50LCBjYWxsYmFjaykge1xuICAgIGVhY2goZWxzLCBmdW5jdGlvbiAoZWwpIHtcbiAgICAgICAgaWYgKGVsLmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICAgICAgICAgIGVsLmFkZEV2ZW50TGlzdGVuZXIoZXZlbnQsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBvZmYoZWxzLCBldmVudCwgY2FsbGJhY2spIHtcbiAgICBlYWNoKGVscywgZnVuY3Rpb24gKGVsKSB7XG4gICAgICAgIGlmIChlbC5yZW1vdmVFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBlbC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50LCBjYWxsYmFjayk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gaW5BcnJheSh2YWx1ZSwgYXJyYXkpIHtcbiAgICByZXR1cm4gW10uaW5kZXhPZi5jYWxsKGFycmF5LCB2YWx1ZSkgPiAtMTtcbn1cblxuZnVuY3Rpb24gb25UYXAoZWxzLCBjYWxsYmFjaykge1xuICAgIHZhciB0b3VjaGVkID0gZmFsc2UsXG4gICAgICAgIHRhcENhbGxiYWNrID0gaGFuZGxlVGFwKGNhbGxiYWNrKTtcblxuICAgIG9uKGVscywgJ2NsaWNrJywgdGFwQ2FsbGJhY2spO1xuICAgIG9uKGVscywgJ3RvdWNoc3RhcnQnLCB0YXBDYWxsYmFjayk7XG5cbiAgICByZXR1cm4gdGFwQ2FsbGJhY2s7XG5cbiAgICBmdW5jdGlvbiBoYW5kbGVUYXAoKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgLy8gcHJldmVudCBjbGljayBldmVudCBldmVudCBpZiB0cmlnZ2VyaW5nIGV2ZW50IHdhcyB0b3VjaHN0YXJ0XG4gICAgICAgICAgICBpZiAoZS50eXBlID09PSAndG91Y2hzdGFydCcpIHtcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgdG91Y2hlZCA9IHRydWU7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRvdWNoZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB0b3VjaGVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjYWxsYmFjayhlKTtcbiAgICAgICAgfTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIG9mZlRhcChlbHMsIGNhbGxiYWNrKSB7XG4gICAgb2ZmKGVscywgJ2NsaWNrJywgY2FsbGJhY2spO1xuICAgIG9mZihlbHMsICd0b3VjaHN0YXJ0JywgY2FsbGJhY2spO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICByZWFkeTogZG9tUmVhZHksXG4gICAgZmluZDogZmluZCxcbiAgICBmaW5kT25lOiBmaW5kT25lLFxuICAgIGZpbmRJZDogZmluZElkLFxuICAgIGVhY2g6IGVhY2gsXG4gICAgb246IG9uLFxuICAgIG9mZjogb2ZmLFxuICAgIGluQXJyYXk6IGluQXJyYXksXG4gICAgb25UYXA6IG9uVGFwLFxuICAgIG9mZlRhcDogb2ZmVGFwXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZG9tID0gcmVxdWlyZSgnLi9kb20uanMnKSxcbiAgICBhcHAgPSByZXF1aXJlKCcuL2FwcC5qcycpO1xuXG5kb20ucmVhZHkoaW5pdCk7XG5cbmZ1bmN0aW9uIGluaXQoKSB7XG4gICAgYXBwKCk7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBBdWRpb0NvbnRleHQgPSB3aW5kb3cuQXVkaW9Db250ZXh0IHx8IHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQsXG4gICAgYXVkaW9Db250ZXh0ID0gbmV3IEF1ZGlvQ29udGV4dCgpLFxuICAgIHNlbWl0b25lTWFwID0ge1xuICAgICAgICBBOiAwLFxuICAgICAgICBCOiAyLFxuICAgICAgICBDOiAzLFxuICAgICAgICBEOiA1LFxuICAgICAgICBFOiA3LFxuICAgICAgICBGOiA4LFxuICAgICAgICBHOiAxMFxuICAgIH07XG5cbmZ1bmN0aW9uIHBsYXlOb3RlKG5vdGUsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29uZmlnID0gb3B0aW9ucyB8fCB7fSxcbiAgICAgICAgb3NjaWxsYXRvciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVPc2NpbGxhdG9yKCksXG4gICAgICAgIGdhaW5Ob2RlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKSxcbiAgICAgICAgY29tcHJlc3NvciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVEeW5hbWljc0NvbXByZXNzb3IoKSxcblxuICAgICAgICBnYWluID0gY29uZmlnLmdhaW4gfHwgMC4yLFxuICAgICAgICB3YXZlVHlwZSA9IGNvbmZpZy53YXZlVHlwZSB8fCAnc2luZScsXG5cbiAgICAgICAgZHVyYXRpb24gPSBjb25maWcuZHVyYXRpb24gfHwgMC4yNSxcbiAgICAgICAgc3RhcnRUaW1lID0gY29uZmlnLnN0YXJ0VGltZSB8fCBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUsXG4gICAgICAgIHN0b3BUaW1lID0gc3RhcnRUaW1lICsgZHVyYXRpb24sXG4gICAgICAgIHRydW5jYXRlID0gY29uZmlnLnRydW5jYXRlIHx8IDA7XG5cbiAgICBvc2NpbGxhdG9yLmNvbm5lY3QoZ2Fpbk5vZGUpO1xuICAgIGdhaW5Ob2RlLmNvbm5lY3QoY29tcHJlc3Nvcik7XG4gICAgY29tcHJlc3Nvci5jb25uZWN0KGF1ZGlvQ29udGV4dC5kZXN0aW5hdGlvbik7XG5cbiAgICBnYWluTm9kZS5nYWluLnZhbHVlID0gZ2FpbjtcblxuICAgIC8vIGZhZGUganVzdCBiZWZvcmUgc3RvcCB0aW1lIHRvIHByZXZlbnQgcG9wc1xuICAgIGdhaW5Ob2RlLmdhaW4uc2V0VGFyZ2V0QXRUaW1lKDAsIChzdG9wVGltZSAtIDAuMDYpIC0gdHJ1bmNhdGUsIDAuMDEpO1xuXG4gICAgb3NjaWxsYXRvci5mcmVxdWVuY3kudmFsdWUgPSBub3RlLmZyZXF1ZW5jeTtcbiAgICBvc2NpbGxhdG9yLnR5cGUgPSB3YXZlVHlwZTtcblxuICAgIG9zY2lsbGF0b3Iuc3RhcnQoc3RhcnRUaW1lKTtcbiAgICBvc2NpbGxhdG9yLnN0b3Aoc3RvcFRpbWUpO1xufVxuXG5mdW5jdGlvbiBtYWtlTm90ZShub3RlTmFtZSkge1xuICAgIHZhciBub3RlID0ge30sXG4gICAgICAgIG9jdGF2ZUluZGV4ID0gKG5vdGVOYW1lLmxlbmd0aCA9PT0gMykgPyAyIDogMTtcblxuICAgIG5vdGUubGV0dGVyID0gbm90ZU5hbWVbMF07XG4gICAgbm90ZS5vY3RhdmUgPSB0b0ludChub3RlTmFtZVtvY3RhdmVJbmRleF0pO1xuXG4gICAgaWYgKG9jdGF2ZUluZGV4ID09PSAyKSB7XG4gICAgICAgIG5vdGUuYWNjaWRlbnRhbCA9IG5vdGVOYW1lWzFdO1xuICAgICAgICBub3RlLmFjY2lkZW50YWxPZmZzZXQgPSAobm90ZS5hY2NpZGVudGFsID09PSAnYicpID8gLTEgOiAxO1xuICAgIH1cblxuICAgIG5vdGUuZnJlcXVlbmN5ID0gY2FsY3VsYXRlTm90ZUZyZXF1ZW5jeShub3RlKTtcblxuICAgIG5vdGUubmFtZSA9IG5vdGVOYW1lO1xuXG4gICAgcmV0dXJuIG5vdGU7XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZU5vdGVGcmVxdWVuY3kobm90ZSkge1xuICAgIHZhciBzZW1pdG9uZU9mZnNldCA9IHNlbWl0b25lTWFwW25vdGUubGV0dGVyXSxcbiAgICAgICAgZGVmYXVsdE9jdGF2ZVNlbWl0b25lcyA9IDUgKiAxMixcbiAgICAgICAgZnJlcXVlbmN5O1xuXG4gICAgc2VtaXRvbmVPZmZzZXQgKz0gKG5vdGUuYWNjaWRlbnRhbE9mZnNldCkgPyBub3RlLmFjY2lkZW50YWxPZmZzZXQgOiAwO1xuXG4gICAgc2VtaXRvbmVPZmZzZXQgKz0gKG5vdGUub2N0YXZlICogMTIpIC0gZGVmYXVsdE9jdGF2ZVNlbWl0b25lcztcblxuICAgIGZyZXF1ZW5jeSA9IGZyZXF1ZW5jeUJ5T2Zmc2V0KDQ0MCwgc2VtaXRvbmVPZmZzZXQpO1xuXG4gICAgcmV0dXJuIChpc05hTihmcmVxdWVuY3kpKSA/IDAgOiBmcmVxdWVuY3k7XG59XG5cbmZ1bmN0aW9uIGZyZXF1ZW5jeUJ5T2Zmc2V0KGJhc2VGcmVxdWVuY3ksIHNlbWl0b25lT2Zmc2V0KSB7XG4gICAgcmV0dXJuIGJhc2VGcmVxdWVuY3kgKiBNYXRoLnBvdygyLCAoc2VtaXRvbmVPZmZzZXQgLyAxMikpO1xufVxuXG5mdW5jdGlvbiBub3RlUmFuZ2UoZmlyc3ROb3RlLCBjb3VudCwgYWNjaWRlbnRhbHMpIHtcbiAgICB2YXIgbm90ZXMgPSBbXSxcbiAgICAgICAgbm90ZSA9IG1ha2VOb3RlKGZpcnN0Tm90ZSksXG4gICAgICAgIGk7XG5cbiAgICBub3Rlcy5wdXNoKG5vdGUpO1xuXG4gICAgY291bnQtLTtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBjb3VudDsgaSsrKSB7XG4gICAgICAgIG5vdGUgPSBuZXh0Tm90ZShub3RlLCBhY2NpZGVudGFscyk7XG4gICAgICAgIG5vdGVzLnB1c2gobm90ZSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIG5vdGVzO1xufVxuXG5mdW5jdGlvbiBub3RlTmFtZVJhbmdlKGZpcnN0Tm90ZSwgY291bnQsIGFjY2lkZW50YWxzKSB7XG4gICAgdmFyIG5vdGVOYW1lcyA9IFtdLFxuICAgICAgICBub3RlID0gbWFrZU5vdGUoZmlyc3ROb3RlKSxcbiAgICAgICAgaTtcblxuICAgIG5vdGVOYW1lcy5wdXNoKG5vdGUubmFtZSk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgY291bnQgLSAxOyBpKyspIHtcbiAgICAgICAgbm90ZSA9IG5leHROb3RlKG5vdGUsIGFjY2lkZW50YWxzKTtcbiAgICAgICAgbm90ZU5hbWVzLnB1c2gobm90ZS5uYW1lKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbm90ZU5hbWVzO1xufVxuXG5mdW5jdGlvbiBuZXh0Tm90ZShub3RlLCBhY2NpZGVudGFscykge1xuICAgIHZhciBub3RlTGV0dGVycyA9ICdBQkNERUZHJy5zcGxpdCgnJyksXG4gICAgICAgIGxldHRlckluZGV4ID0gbm90ZUxldHRlcnMuaW5kZXhPZihub3RlLmxldHRlciksXG4gICAgICAgIG9jdGF2ZSA9IG5vdGUub2N0YXZlLFxuICAgICAgICBsZXR0ZXI7XG5cbiAgICBpZiAoY2FuSGF2ZUFjY2lkZW50YWwobm90ZSkpIHtcbiAgICAgICAgbGV0dGVyID0gbm90ZS5sZXR0ZXIgKyAnIyc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbGV0dGVyID0gbmV4dExldHRlcihsZXR0ZXJJbmRleCk7XG5cbiAgICAgICAgaWYgKGxldHRlciA9PT0gJ0EnKSB7XG4gICAgICAgICAgICBvY3RhdmUrKztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBtYWtlTm90ZShsZXR0ZXIgKyBvY3RhdmUpO1xuXG4gICAgZnVuY3Rpb24gbmV4dExldHRlcihjdXJyZW50SW5kZXgpIHtcbiAgICAgICAgdmFyIGluZGV4ID0gY3VycmVudEluZGV4ICsgMTtcblxuICAgICAgICByZXR1cm4gKG5vdGVMZXR0ZXJzW2luZGV4XSkgPyBub3RlTGV0dGVyc1tpbmRleF0gOiBub3RlTGV0dGVyc1swXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjYW5IYXZlQWNjaWRlbnRhbCgpIHtcbiAgICAgICAgaWYgKCFhY2NpZGVudGFscykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vdGUuYWNjaWRlbnRhbCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIChub3RlLmxldHRlciA9PT0gJ0InIHx8IG5vdGUubGV0dGVyID09PSAnRScpID8gZmFsc2UgOiB0cnVlO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcHJldk5vdGUobm90ZSwgYWNjaWRlbnRhbHMpIHtcbiAgICB2YXIgbm90ZUxldHRlcnMgPSAnQUJDREVGRycuc3BsaXQoJycpLFxuICAgICAgICBsZXR0ZXJJbmRleCA9IG5vdGVMZXR0ZXJzLmluZGV4T2Yobm90ZS5sZXR0ZXIpLFxuICAgICAgICBvY3RhdmUgPSBub3RlLm9jdGF2ZSxcbiAgICAgICAgbGV0dGVyO1xuXG4gICAgaWYgKG5vdGUuYWNjaWRlbnRhbCAmJiBhY2NpZGVudGFscykge1xuICAgICAgICBsZXR0ZXIgPSBub3RlLmxldHRlcjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBsZXR0ZXIgPSBwcmV2TGV0dGVyKGxldHRlckluZGV4KTtcblxuICAgICAgICBpZiAobGV0dGVyID09PSAnRycpIHtcbiAgICAgICAgICAgIG9jdGF2ZS0tO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIG1ha2VOb3RlKGxldHRlciArIG9jdGF2ZSk7XG5cbiAgICBmdW5jdGlvbiBwcmV2TGV0dGVyKGN1cnJlbnRJbmRleCkge1xuICAgICAgICB2YXIgaW5kZXggPSBjdXJyZW50SW5kZXggLSAxO1xuXG4gICAgICAgIHJldHVybiAobm90ZUxldHRlcnNbaW5kZXhdKSA/IG5vdGVMZXR0ZXJzW2luZGV4XSA6IG5vdGVMZXR0ZXJzW25vdGVMZXR0ZXJzLmxlbmd0aCAtIDFdO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdG9JbnQodmFsdWUpIHtcbiAgICByZXR1cm4gcGFyc2VJbnQodmFsdWUsIDEwKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgYXVkaW9Db250ZXh0OiBhdWRpb0NvbnRleHQsXG4gICAgcGxheU5vdGU6IHBsYXlOb3RlLFxuICAgIG5vdGVSYW5nZTogbm90ZVJhbmdlLFxuICAgIG5vdGVOYW1lUmFuZ2U6IG5vdGVOYW1lUmFuZ2UsXG4gICAgbWFrZU5vdGU6IG1ha2VOb3RlLFxuICAgIG5leHROb3RlOiBuZXh0Tm90ZSxcbiAgICBwcmV2Tm90ZTogcHJldk5vdGVcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBkb20gPSByZXF1aXJlKCcuL2RvbS5qcycpLFxuICAgIGtub3RlID0gcmVxdWlyZSgnLi9rbm90ZS5qcycpO1xuXG52YXIgc291bmRzID0gW10sXG4gICAgY3VycmVudEJlYXQgPSAwLFxuICAgIGJlYXREdXJhdGlvbiA9IDAuMjUsXG4gICAgY3VycmVudExvb3AgPSAwLFxuICAgIG1heExvb3BzID0gNTAsXG4gICAgYmVhdENvdW50ID0gOCxcbiAgICBuZXh0QmVhdFRpbWUsXG4gICAgbm90ZUNvbmZpZyxcbiAgICBzdGFydFRpbWUsXG4gICAgbm90ZXMsXG4gICAgZWxMb29wO1xuXG5mdW5jdGlvbiBzeW50aExvb3AoY29uZmlnKSB7XG4gICAgZWxMb29wID0gY29uZmlnLmVsTG9vcDtcbiAgICBub3RlQ29uZmlnID0gY29uZmlnLm5vdGVDb25maWc7XG4gICAgbm90ZXMgPSBrbm90ZS5ub3RlUmFuZ2UoY29uZmlnLmZpcnN0Tm90ZSwgY29uZmlnLm5vdGVDb3VudCwgZmFsc2UpLnJldmVyc2UoKTtcbiAgICBiZWF0Q291bnQgPSBjb25maWcuYmVhdENvdW50IHx8IGJlYXRDb3VudDtcbiAgICBtYXhMb29wcyA9IGNvbmZpZy5tYXhMb29wcyB8fCBtYXhMb29wcztcblxuICAgIG1ha2VTb3VuZHMoKTtcbiAgICByZW5kZXIoKTtcbiAgICBhZGRMaXN0ZW5lcnMoKTtcbn1cblxuZnVuY3Rpb24gbG9vcCgpIHtcbiAgICBzZXRUaW1lcygpO1xuXG4gICAgaWYgKHNob3VsZFVwZGF0ZSgpKSB7XG4gICAgICAgIHF1ZXVlQmVhdFNvdW5kcygpO1xuICAgICAgICBxdWV1ZUJlYXRWaXN1YWxzKCk7XG4gICAgfVxuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmIChjdXJyZW50TG9vcCA8IG1heExvb3BzKSB7XG4gICAgICAgICAgICBsb29wKCk7XG4gICAgICAgIH1cbiAgICB9LCAxMCk7XG59XG5cbmZ1bmN0aW9uIHNldFRpbWVzKCkge1xuICAgIHN0YXJ0VGltZSA9IHN0YXJ0VGltZSB8fCBrbm90ZS5hdWRpb0NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgbmV4dEJlYXRUaW1lID0gc3RhcnRUaW1lICsgY3VycmVudEJlYXQgKiBiZWF0RHVyYXRpb24gKyAoY3VycmVudExvb3AgKiBiZWF0RHVyYXRpb24gKiBiZWF0Q291bnQpO1xufVxuXG5mdW5jdGlvbiBzaG91bGRVcGRhdGUoKSB7XG4gICAgaWYgKGtub3RlLmF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSA+IG5leHRCZWF0VGltZSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXVlQmVhdFNvdW5kcygpIHtcbiAgICB2YXIgaTtcblxuICAgIG5vdGVDb25maWcuc3RhcnQgPSBuZXh0QmVhdFRpbWU7XG4gICAgbm90ZUNvbmZpZy5kdXJhdGlvbiA9IGJlYXREdXJhdGlvbjtcblxuICAgIGZvciAoaSA9IDA7IGkgPCBzb3VuZHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcXVldWVCZWF0U291bmQoc291bmRzW2ldW2N1cnJlbnRCZWF0XSk7XG4gICAgfVxuXG4gICAgY3VycmVudEJlYXQrKztcblxuICAgIGlmIChjdXJyZW50QmVhdCA9PT0gYmVhdENvdW50KSB7XG4gICAgICAgIGN1cnJlbnRCZWF0ID0gMDtcbiAgICAgICAgY3VycmVudExvb3ArKztcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXVlQmVhdFNvdW5kKGJlYXQpIHtcbiAgICBpZiAoYmVhdC5hY3RpdmUpIHtcbiAgICAgICAga25vdGUucGxheU5vdGUoYmVhdC5ub3RlLCBub3RlQ29uZmlnKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHF1ZXVlQmVhdFZpc3VhbHMoKSB7XG4gICAgdmFyIGN1cnJlbnRCZWF0RWxzID0gZG9tLmZpbmQoJy5zeW50aC1sb29wX19iZWF0LScgKyAoY3VycmVudEJlYXQgKyAxKSk7XG5cbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZG9tLmVhY2goY3VycmVudEJlYXRFbHMsIGZ1bmN0aW9uIChlbCkge1xuICAgICAgICAgICAgdmFyIGN1cnJlbnRDbGFzcyA9IGVsLmNsYXNzTGlzdC5jb250YWlucygnbG9vcC0xJykgPyAnbG9vcC0yJyA6ICdsb29wLTEnO1xuXG4gICAgICAgICAgICBlbC5jbGFzc0xpc3QucmVtb3ZlKCdsb29wLTEnKTtcbiAgICAgICAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2xvb3AtMicpO1xuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBlbC5jbGFzc0xpc3QuYWRkKGN1cnJlbnRDbGFzcyk7XG4gICAgICAgICAgICB9LCAwKTtcbiAgICAgICAgfSk7XG4gICAgfSwgbmV4dEJlYXRUaW1lKTtcbn1cblxuZnVuY3Rpb24gbWFrZVNvdW5kcygpIHtcbiAgICB2YXIgc291bmQsXG4gICAgICAgIGk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgbm90ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgc291bmQgPSBtYWtlQmVhdHMoaSk7XG4gICAgICAgIHNvdW5kcy5wdXNoKHNvdW5kKTtcbiAgICB9XG5cbiAgICByZXR1cm4gc291bmRzO1xufVxuXG5mdW5jdGlvbiBtYWtlQmVhdHMobm90ZUluZGV4KSB7XG4gICAgdmFyIGJlYXRzID0gW10sXG4gICAgICAgIGk7XG5cbiAgICBmb3IgKGkgPSAwOyBpIDwgYmVhdENvdW50OyBpKyspIHtcbiAgICAgICAgYmVhdHMucHVzaChtYWtlQmVhdChub3RlSW5kZXgpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gYmVhdHM7XG59XG5cbmZ1bmN0aW9uIG1ha2VCZWF0KG5vdGVJbmRleCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICAgIG5vdGU6IG5vdGVzW25vdGVJbmRleF1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBhZGRMaXN0ZW5lcnMoKSB7XG4gICAgdmFyIGk7XG5cbiAgICBmb3IgKGkgPSAxOyBpIDw9IG5vdGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGFkZEJlYXRMaXN0ZW5lcnMoaSk7XG4gICAgfVxuXG4gICAgYWRkSW5pdExpc3RlbmVyKCk7XG59XG5cbmZ1bmN0aW9uIGFkZEluaXRMaXN0ZW5lcigpIHtcbiAgICB2YXIgdGFwQ2FsbGJhY2sgPSBkb20ub25UYXAoZWxMb29wLCBpbml0TG9vcCk7XG5cbiAgICBmdW5jdGlvbiBpbml0TG9vcCgpIHtcbiAgICAgICAga25vdGUucGxheU5vdGUoe2ZyZXF1ZW5jeTogMH0pO1xuICAgICAgICBsb29wKCk7XG4gICAgICAgIGVsTG9vcC5jbGFzc0xpc3QuYWRkKCdzdGFydGVkJyk7XG4gICAgICAgIGRvbS5vZmZUYXAoZWxMb29wLCB0YXBDYWxsYmFjayk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBhZGRCZWF0TGlzdGVuZXJzKHBhcmVudEluZGV4KSB7XG4gICAgdmFyIGk7XG5cbiAgICBmb3IgKGkgPSAxOyBpIDw9IGJlYXRDb3VudDsgaSsrKSB7XG4gICAgICAgIGRvbS5vblRhcChkb20uZmluZCgnLnN5bnRoLWxvb3BfX3NvdW5kLScgKyBwYXJlbnRJbmRleCArICcgLnN5bnRoLWxvb3BfX2JlYXQtJyArIGkpLCB0b2dnbGVCZWF0U291bmQocGFyZW50SW5kZXgsIGkpKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZUJlYXRTb3VuZChzb3VuZEluZGV4LCBiZWF0SW5kZXgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgdmFyIGJlYXQgPSBzb3VuZHNbc291bmRJbmRleCAtIDFdW2JlYXRJbmRleCAtIDFdO1xuXG4gICAgICAgIGlmIChlLmN1cnJlbnRUYXJnZXQuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJykpIHtcbiAgICAgICAgICAgIGJlYXQuYWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJlYXQuYWN0aXZlID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgdmFyIHNvdW5kc0h0bWwgPSBbXSxcbiAgICAgICAgaTtcblxuICAgIGZvciAoaSA9IDE7IGkgPD0gbm90ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgc291bmRzSHRtbC5wdXNoKCc8ZGl2IGNsYXNzPVwic3ludGgtbG9vcF9fc291bmQgc3ludGgtbG9vcF9fc291bmQtJyArIGkgKyAnXCI+Jyk7XG4gICAgICAgIHNvdW5kc0h0bWwucHVzaChtYWtlQmVhdEVscygpKTtcbiAgICAgICAgc291bmRzSHRtbC5wdXNoKCc8L2Rpdj4nKTtcbiAgICB9XG5cbiAgICBlbExvb3AuaW5uZXJIVE1MID0gc291bmRzSHRtbC5qb2luKCcnKTtcbn1cblxuZnVuY3Rpb24gbWFrZUJlYXRFbHMoKSB7XG4gICAgdmFyIGJlYXRFbHMgPSBbXSxcbiAgICAgICAgaTtcblxuICAgIGZvciAoaSA9IDE7IGkgPD0gYmVhdENvdW50OyBpKyspIHtcbiAgICAgICAgYmVhdEVscy5wdXNoKCc8ZGl2IGNsYXNzPVwic3ludGgtbG9vcF9fYmVhdCBzeW50aC1sb29wX19iZWF0LScgKyBpICsgJyBsb29wLTJcIj48ZGl2PjwvZGl2PjwvZGl2PicpO1xuICAgIH1cblxuICAgIHJldHVybiBiZWF0RWxzLmpvaW4oJycpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHN5bnRoTG9vcDtcbiJdfQ==
