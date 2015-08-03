'use strict';

module.exports = function (grunt) {
    grunt.registerTask('default', [
        'postcss',
        'watchify:appOnce',
        'concurrent:dev'
    ]);
};
