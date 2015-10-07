'use strict';

module.exports = {
    dev: {
        tasks: [
            'watch:livereload',
            'watch:postcss',
            'browserify:app',
            'connect'
        ],
        options: {
            logConcurrentOutput: true
        }
    }
};
