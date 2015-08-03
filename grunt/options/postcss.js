'use strict';

module.exports = {
    options: {
        map: {
            inline: false,
            annotation: 'build/css/maps/'
        },
        processors: [
            require('postcss-import'),
            require('postcss-nested'),
            require('autoprefixer-core')({
                browsers: '> 5%'
            })
        ]
    },

    dist: {
        src: 'src/css/app.css',
        dest: 'build/css/app.css'
    }
};
