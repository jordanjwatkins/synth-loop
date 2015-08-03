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
