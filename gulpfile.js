var DIST = "./";
var SRC = "./src";
var gulp = require("gulp");
var runSequence = require('run-sequence');
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json", {});
var replace = require('gulp-replace');
var merge = require("merge2");
var typedoc = require("gulp-typedoc");
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var connect = require('gulp-connect');

var copyright = '/*!\n * Copyright po-to.org All Rights Reserved.\n * https://github.com/po-to/\n * Licensed under the MIT license\n */\n';

gulp.task("tsc", function () {
    var tsResult = gulp.src(SRC + "/**/*.ts")
        .pipe(tsProject())
    return merge([
        tsResult.dts.pipe(replace(/([\s\S]*)/m, copyright+'$1'))
        .pipe(gulp.dest(DIST)),
        tsResult.js.pipe(replace(/([\s\S]*)/m, copyright+'$1'))
        .pipe(gulp.dest(DIST))
        .pipe(uglify())
        .pipe(replace(/([\s\S]*)/m, copyright+'$1'))
        .pipe(rename(function (path) {
            path.extname = ".min"+path.extname;
        }))
        .pipe(gulp.dest(DIST))
    ]);
});

gulp.task("tscdoc", function () {
    return gulp.src(SRC + "/**/*.ts")
        .pipe(typedoc({
            module: "amd",
            target: "es6",
            includeDeclarations: false,
            out: DIST + "/docs",
            theme : "minimal",
            excludePrivate: true, 
            excludeExternals: true,
            name: "@po-to/poto-cache",
            ignoreCompilerErrors: false,
            version: true,
        }))
});

gulp.task('examples', function () {
    connect.server({
        port: "3333", 
        root: ["./examples/"],
        livereload: false
    });
});

gulp.task('bulid', function (callback) { runSequence(['tsc', 'tscdoc'] , callback) });

gulp.task('default', ["bulid"]);


