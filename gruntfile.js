module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        distDir: "dist",
        buildDir: "build",

        bower: {
            install: {
                options: {
                    targetDir: "elogio-firefox/data/deps"
                }
            }
        },

        "clean": {
            src: ["<%= buildDir%>" , "<%= distDir %>"]
        },

        "mozilla-addon-sdk": {
            "1_17": {
                options: {
                    revision: "1.17"
                }
            }
        },

        "mozilla-cfx": {
            "stable": {
                options: {
                    "mozilla-addon-sdk": "1_17",
                    extension_dir: "elogio-firefox",
                    command: "run"
                }
            }
        },

        "mozilla-cfx-xpi": {
            "stable": {
                options: {
                    "mozilla-addon-sdk": "1_17",
                    extension_dir: "<%=buildDir%>",
                    dist_dir: "dist"
                }
            }
        },

        "jshint": {
            contentScript: {
                src: [
                    './elogio-firefox/data/**/*.js',
                ],
                options: {
                    jshintrc: './elogio-firefox/data/.jshintrc'
                }
            },

            chrome: {
                src: [
                    './elogio-firefox/lib/**/*.js'
                ],
                options: {
                    jshintrc: './elogio-firefox/lib/.jshintrc'
                }
            }
        },

        uglify: {
            minify: {
                options: {
                    mangle: true,
                    compress: true,
                    preserveComments: false,
                    beautify: false},
                src: ["**/*.js"],
                cwd: "elogio-firefox/",
                dest: "<%= buildDir%>/",
                expand: true
            },
            beautify: {
                options: {
                    mangle: false,
                    compress: false,
                    preserveComments: true,
                    beautify: true
                },
                src: ["**/*.js"],
                cwd: "elogio-firefox/",
                dest: "<%= buildDir%>/",
                expand: true
            },
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            }
        },

        copy: {
            resourcesWithoutJS: {
                src: ["**", "!**/*.js"],
                cwd: "elogio-firefox/",
                dest: "<%= buildDir%>/",
                expand: true
            }
        }

    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mozilla-addon-sdk');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-bower-task');


    /**
     * Helper tasks.
     */
    grunt.registerTask('lint', ['jshint:chrome', 'jshint:contentScript']);

    /**
     * End-user tasks.
     *
     * These are used to build, run and test the product.
     */
    grunt.registerTask('default', function () {
        grunt.log.write('\n\nElog.io Mozilla plugin build system. Please use any of following: ');
        grunt.log.write('\n   grunt run -- runs the firefox with the extension in debug mode.');
        grunt.log.write('\n   grunt dist-debug -- makes an XPI packaged (see dist folder), with all the resources and sources unchanged ');
        grunt.log.write('\n   grunt dist-minified -- makes an XPI ready for production (uglified) ');
    });

    grunt.registerTask('run', [
        'bower',
        'mozilla-addon-sdk',
        'mozilla-cfx']);

    grunt.registerTask('dist-debug', [
        'clean',
        'bower',
        'lint',
        'copy:resourcesWithoutJS',
        'uglify:beautify',
        'mozilla-addon-sdk',
        'mozilla-cfx-xpi']);

    grunt.registerTask('dist-minified', [
        'clean',
        'lint',
        'bower',
        'copy:resourcesWithoutJS',
        'uglify:minify',
        'mozilla-addon-sdk',
        'mozilla-cfx-xpi']);
};