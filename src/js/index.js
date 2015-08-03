'use strict';

var dom = require('./dom.js'),
    app = require('./app.js');

dom.ready(init);

function init() {
    app();
}
