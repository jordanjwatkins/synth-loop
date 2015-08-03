'use strict';

module.exports = {
    app: {
        src: './src/js/index.js',
        dest: 'build/index.js',
        options: {
            keepalive: true
        }
    },

    appOnce: {
        src: './src/js/index.js',
        dest: 'build/index.js'
    }
};
