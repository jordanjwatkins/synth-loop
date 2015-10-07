'use strict';

var appSrc = './src/js/index.js',
    appDest = 'build/index.js',
    testSrc = './test/*Spec.js',
    testDest = 'build/test_bundle.js';

module.exports = {
    options: {
        watch: true,
        keepAlive: true,
        browserifyOptions : {
            debug: true
        }
    },

    app: {
        src: appSrc,
        dest: appDest
    },

    appBabelify: {
        src: appSrc,
        dest: appDest,
        options: {
            transform: ['babelify']
        }
    },

    test: {
        src: testSrc,
        dest: testDest
    },

    testBabelify: {
        src: testSrc,
        dest: testDest,
        options: {
            transform: ['babelify']
        }
    }
};
