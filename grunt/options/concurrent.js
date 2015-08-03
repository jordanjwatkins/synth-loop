'use strict';

module.exports = {
    dev: {
        tasks: [
            'watch:livereload',
            'watch:postcss',
            'rewatchify',
            'connect'
        ],
        options: {
            logConcurrentOutput: true
        }
    }
};
