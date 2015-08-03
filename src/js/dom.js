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
