'use strict';

module.exports = function (grunt) {
    grunt.registerTask('rewatchify', '', function () {
        var done = this.async();

        spawnWatchify();

        function spawnWatchify() {
            grunt.util.spawn({
                grunt: true,
                args: 'watchify:app',
                opts: {
                    stdio: 'inherit'
                }
            }, function (err) {
                if (err) {
                    grunt.log.writeln('\nwatchify error: restarting on next save\n');
                    grunt.task.run('watch:watchifyRestart');
                    done();
                }
            });
        }
    });
};
