'use strict';

module.exports = function (grunt) {
    grunt.registerTask('default', [
        'postcss',
        'concurrent:dev'
    ]);
};
