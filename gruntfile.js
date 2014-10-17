module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        distDir: "dist/",
        buildDir: "build/",
        manifest: grunt.file.readJSON('elogio-chrome/manifest.json'),
        bower: {
            install: {
                options: {
                    targetDir: "elogio-commons/data/deps"
                }
            }
        },
        htmlbuild: {
            chrome: {
                src: 'elogio-chrome/html/template.html',
                dest: '<%= buildDir%>/chrome/html/',
                options: {
                    sections: {
                        imageCard: 'elogio-commons/data/templates/imageTemplate.html',
                        clipboard: 'elogio-commons/data/templates/clipboardTemplate.html',
                        common: 'elogio-commons/data/templates/commonTemplate.html'
                    }
                }
            },
            firefox: {
                src: 'elogio-firefox/data/html/panel.html',
                dest: '<%= buildDir%>/firefox/data/html/',
                options: {
                    sections: {
                        imageCard: 'elogio-commons/data/templates/imageTemplate.html',
                        clipboard: 'elogio-commons/data/templates/clipboardTemplate.html',
                        common: 'elogio-commons/data/templates/commonTemplate.html'
                    }
                }
            }
        },
        crx: {
            package: {
                "src": "build/chrome",
                "dest": "dist/chrome/elogio-chrome-<%= manifest.version %>.crx",
                "exclude": [ ".git", ".svn" ],
                "privateKey": "elogio-chrome/chrome.pem",
                "options": {
                    "maxBuffer": 3000 * 1024 //build extension with a weight up to 3MB
                }
            }
        },
        clean: {
            firefox: ["<%= buildDir%>/firefox" , "<%= distDir %>/firefox", "tmp/mozilla-addon-sdk/addon-sdk-1.17-official/python-lib/cuddlefish/tests"],
            chrome: ["<%= buildDir%>/chrome" , "<%= distDir %>/chrome", "tmp/mozilla-addon-sdk/addon-sdk-1.17-official/python-lib/cuddlefish/tests"]
        },

        less: {
            compileFirefox: {
                options: {
                    paths: ["elogio-firefox/data/less"]
                },
                files: {
                    "<%= buildDir%>/firefox/data/css/sidebar.css": "elogio-firefox/data/less/sidebar.less",
                    "<%= buildDir%>/firefox/data/css/highlight.css": "elogio-commons/css/highlight.css"
                }
            },
            compileChrome: {
                options: {
                    paths: ["elogio-chrome/data/less"]
                },
                files: {
                    "<%= buildDir%>/chrome/styles/panel.css": "elogio-chrome/data/less/panel.less",
                    "<%= buildDir%>/chrome/styles/highlight.css": "elogio-commons/css/highlight.css"
                }
            }
        },

        concat: {
            options: {
                stripBanners: false,
                banner: '/*! <%= pkg.name %> modules - v<%= pkg.version %> - ' +
                    '<%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            firefoxModules: {
                files: {
                    '<%= buildDir%>/firefox/data/js/common-lib.js': [
                        'elogio-commons/data/js/common.js',
                        'elogio-commons/data/js/config.js',
                        'elogio-commons/data/js-modules/*.js',
                        'elogio-commons/data/deps/png.js/zlib.js',
                        'elogio-commons/data/deps/png.js/png.js',
                        'elogio-commons/data/deps/jpgjs/jpg.js',
                        'elogio-commons/data/deps/blockhash-js/blockhash.js'
                    ],
                    '<%= buildDir%>/firefox/lib/common-chrome-lib.js': [
                        'elogio-commons/data/js/common.js',
                        'elogio-commons/data/js/config.js',
                        'elogio-commons/data/js-modules/*.js',
                        'elogio-firefox/data/private-modules/*.js',
                        'elogio-commons/data/js-modules/chrome/*.js'

                    ]
                }
            },
            chromeModules: {
                files: {
                    '<%= buildDir%>/chrome/data/js/common-lib.js': [
                        'elogio-commons/data/js/common.js',
                        'elogio-commons/data/js/config.js',
                        'elogio-commons/data/js-modules/*.js',
                        'elogio-commons/data/deps/png.js/zlib.js',
                        'elogio-commons/data/deps/png.js/png.js',
                        'elogio-commons/data/deps/jpgjs/jpg.js',
                        'elogio-commons/data/deps/blockhash-js/blockhash.js',
                        'elogio-chrome/data/modules/sidebar-module.js',
                        'elogio-chrome/data/modules/messaging.js'
                    ],
                    '<%= buildDir%>/chrome/main/common-chrome-lib.js': [
                        'elogio-commons/data/js/common.js',
                        'elogio-commons/data/js/config.js',
                        'elogio-commons/data/js-modules/*.js',
                        'elogio-chrome/data/modules/elogio-request.js',
                        'elogio-commons/data/js-modules/chrome/*.js',
                        'elogio-chrome/data/modules/messaging.js'
                    ]
                }
            }
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
                    extension_dir: "<%= buildDir%>/firefox",
                    command: "run"
                }
            }
        },

        "mozilla-cfx-xpi": {
            "stable": {
                options: {
                    "mozilla-addon-sdk": "1_17",
                    extension_dir: "<%=buildDir%>/firefox",
                    dist_dir: "dist/firefox"
                }
            }
        },

        "jshint": {
            firefoxContentScript: {
                files: [
                    {
                        src: [
                            'elogio-firefox/data/**/*.js'
                        ]
                    }
                ],
                options: {
                    jshintrc: './elogio-firefox/data/js/.jshintrc'
                }
            },
            commonLibs: {
                files: [
                    {
                        src: [
                            'elogio-commons/data/js/*.js',
                            'elogio-commons/data/js-modules/**'
                        ]
                    }
                ],
                options: {
                    jshintrc: './elogio-commons/data/js/.jshintrc'
                }
            },
            firefoxChrome: {
                src: [
                    './elogio-firefox/lib/**/*.js'
                ],
                options: {
                    jshintrc: './elogio-firefox/lib/.jshintrc'
                }
            },
            chromeContentScript: {
                files: [
                    {
                        src: [
                            'elogio-chrome/data/js/*.js',
                            'elogio-chrome/data/modules/*.js'
                        ]
                    }
                ],
                options: {
                    jshintrc: './elogio-chrome/data/js/.jshintrc'
                }
            },

            chromeMain: {
                src: [
                    './elogio-chrome/main/**/*.js'
                ],
                options: {
                    jshintrc: './elogio-chrome/main/.jshintrc'
                }
            }
        },

        uglify: {
            minifyFirefox: {
                options: {
                    mangle: true,
                    compress: true,
                    preserveComments: false,
                    beautify: false},
                src: ["**/**.js"],
                cwd: "elogio-firefox/",
                dest: "<%= buildDir%>/firefox/",
                expand: true
            },
            beautifyFirefox: {
                options: {
                    mangle: false,
                    compress: false,
                    preserveComments: true,
                    beautify: true
                },
                src: ["**/*.js"],
                cwd: "elogio-firefox/",
                dest: "<%= buildDir%>/firefox/",
                expand: true
            },
            minifyChrome: {
                options: {
                    mangle: true,
                    compress: true,
                    preserveComments: false,
                    beautify: false},
                src: ["**/*.js"],
                cwd: "<%= buildDir%>/chrome/",
                dest: "<%= buildDir%>/chrome/",
                expand: true
            },
            beautifyChrome: {
                options: {
                    mangle: false,
                    compress: false,
                    preserveComments: true,
                    beautify: true
                },
                src: ["**/*.js", "!**/modules/**"],
                cwd: "elogio-chrome/",
                dest: "<%= buildDir%>/chrome/",
                expand: true
            },
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            }
        },

        copy: {
            resourcesWithoutJSForFirefox: {
                src: ["**", "!**/*.js", "!**/panel.html", "!**/test", "!**/tests"],
                cwd: "elogio-firefox/",
                dest: "<%= buildDir%>/firefox/",
                expand: true
            },
            scriptsffx: {
                src: ["**lib/*.js", "**/data/js/*.js"],
                cwd: "elogio-firefox/",
                dest: "<%= buildDir%>/firefox/",
                expand: true
            },
            resourcesWithoutJSForChrome: {
                src: ["**", "!**/*.js", "!**.pem", "!html/", "!**/modules", "!**/test", "!**/tests"],
                cwd: "elogio-chrome/",
                dest: "<%= buildDir%>/chrome/",
                expand: true
            },
            scriptscrx: {
                src: ["**/data/js/*.js", "main/*.js"],
                cwd: "elogio-chrome/",
                dest: "<%= buildDir%>/chrome/",
                expand: true
            },
            //we need to copy libs (like jquery,mustache etc.) into build folder
            chromeLibs: {
                src: ["**/jquery.color.js", "**/jquery.js", "**/jquery.js", "**/bootstrap.js", "**/mustache.js", "**/bootstrap.css", "!**/test/**"],
                cwd: "elogio-commons/data/deps/",
                dest: "<%= buildDir%>/chrome/data/deps/",
                expand: true
            },
            firefoxLibs: {
                src: ["**/jquery.color.js", "**/jquery.js", "**/jquery.js", "**/bootstrap.js", "**/mustache.js", "**/bootstrap.css", "!**/test/**"],
                cwd: "elogio-commons/data/deps/",
                dest: "<%= buildDir%>/firefox/data/deps/",
                expand: true
            }
        }

    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-html-build');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mozilla-addon-sdk');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-crx');

    /**
     * Helper tasks.
     */
    grunt.registerTask('lint-firefox', ['jshint:firefoxChrome', 'jshint:firefoxContentScript']);
    grunt.registerTask('lint-chrome', ['jshint:chromeMain', 'jshint:chromeContentScript']);
    grunt.registerTask('lint', ['jshint:firefoxChrome', 'jshint:firefoxContentScript', 'jshint:chromeMain', 'jshint:chromeContentScript']);
    /**
     * End-user tasks.
     *
     * These are used to build, run and test the product.
     */
    grunt.registerTask('help', function () {
        grunt.log.write('\n\nElog.io Mozilla plugin build system. Please use any of following: ');
        grunt.log.write('\n   grunt build -- builds both of extensions into build dir (folders chrome and firefox).');
        grunt.log.write('\n   grunt build:firefox -- builds firefox extensions to build dir (folder firefox)');
        grunt.log.write('\n   grunt build:chrome -- builds chrome extensions to build dir (folder chrome)');
        grunt.log.write('\n   grunt grunt run:firefox -- runs the firefox plugin in the browser');
        grunt.log.write('\n   grunt dist -- in the `dist` folder, creates two packaged extensions (XPI for firefox into `dist/firefox` folder and CRX for google chrome into `dist/chrome` folder) ready to be passed over. The sources ');
        grunt.log.write('\n   grunt dist:firefox - same as `dist` but only for firefox addon. (minimal)');
        grunt.log.write('\n   dist:chrome` - same as `dist` but only for google chrome addon. (minimal)');
    });

    grunt.registerTask('build', 'Task with parameters ', function (parameter) {
        function buildFirefox() {
            grunt.task.run([
                'lint-firefox',
                'less:compileFirefox',
                'copy:resourcesWithoutJSForFirefox',
                'htmlbuild:firefox',
                'copy:firefoxLibs',
                'copy:scriptsffx',
                'concat:firefoxModules',
                'uglify:beautifyFirefox'
            ]);
        }

        function buildChrome() {
            grunt.task.run([
                'lint-chrome',
                'less:compileChrome',
                'copy:resourcesWithoutJSForChrome',
                'htmlbuild:chrome',
                'copy:chromeLibs',
                'copy:scriptscrx',
                'concat:chromeModules',
                'uglify:beautifyChrome'
            ]);
        }

        switch (parameter) {
            case 'firefox':
                buildFirefox();
                break;
            case 'chrome':
                buildChrome();
                break;
            default:
                buildFirefox();
                buildChrome();
        }

    });
    grunt.registerTask('run', 'Task with parameters ', function (parameter) {
        function runFirefox() {
            grunt.task.run([
                'lint-firefox',
                'less:compileFirefox',
                'copy:resourcesWithoutJSForFirefox',
                'htmlbuild:firefox',
                'copy:firefoxLibs',
                'copy:scriptsffx',
                'concat:firefoxModules',
                'uglify:minifyFirefox',
                'mozilla-addon-sdk',
                'mozilla-cfx'
            ]);
        }

        //how to run chrome?
        function runChrome() {
            grunt.task.run([
                'lint-chrome',
                'less:compileChrome',
                'copy:resourcesWithoutJSForChrome',
                'htmlbuild:chrome',
                'uglify:beautifyChrome',
                'copy:chromeLibs',
                'copy:scriptscrx',
                'concat:chromeModules'
            ]);
        }

        switch (parameter) {
            case 'firefox':
                runFirefox();
                break;
            case 'chrome':
                runChrome();
                break;
            default:
                runFirefox();
                runChrome();
        }

    });
    grunt.registerTask('dist', 'Task with parameters ', function (parameter) {
        function distFirefox() {
            grunt.task.run([
                'clean:firefox',
                'bower',
                'lint-firefox',
                'less:compileFirefox',
                'copy:resourcesWithoutJSForFirefox',
                'htmlbuild:firefox',
                'copy:firefoxLibs',
                'copy:scriptsffx',
                'concat:firefoxModules',
                'uglify:minifyFirefox',
                'mozilla-addon-sdk',
                'mozilla-cfx-xpi'
            ]);
        }

        //how to package chrome?
        function distChrome() {
            grunt.task.run([
                'clean:chrome',
                'bower',
                'lint-chrome',
                'less:compileChrome',
                'copy:resourcesWithoutJSForChrome',
                'htmlbuild:chrome',
                'copy:chromeLibs',
                'copy:scriptscrx',
                'concat:chromeModules',
                'uglify:minifyChrome',
                'crx'
            ]);
        }

        switch (parameter) {
            case 'firefox':
                distFirefox();
                break;
            case 'chrome':
                distChrome();
                break;
            default:
                distFirefox();
                distChrome();
        }

    });
};