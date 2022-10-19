'use strict';
var gulp = require('gulp');
var gutil = require('gulp-util');
var minimist = require('minimist');
var _ = require('lodash');
var sourcemaps = require('gulp-sourcemaps');

var pkg = require('./package.json');
var paths = pkg.paths;
var opts = minimist(process.argv.slice(2));
var argv = require('yargs').argv;
var path = require('path');
var gif = require('gulp-if');
var merge = require('merge-stream');
var sass = require('gulp-sass');
var prefix = require('gulp-autoprefixer');
var htmlmin = require('gulp-htmlmin');

var rootPath = argv.JenkinsCartridgesPath || __dirname;

gulp.task('bootstrap4', function () {
	var streams = merge();
	paths.css.forEach(function (p) {
		var srcPath = path.join(rootPath, p.src),
			destPath = path.join(rootPath, p.dest);
		srcPath = srcPath+ 'bootstrap4/';
		destPath = destPath+ 'bootstrap4/';
		var includePaths = paths.includePaths.map(function(ip) {
				return path.join(rootPath, ip);
		});

		streams.add(gulp.src(srcPath + '*.scss')
			.pipe(gif(gutil.env.sourcemaps, sourcemaps.init()))
			.pipe(sass({
				includePaths: includePaths+'bootstrap4/'
			 }).on('error', sass.logError))
			.pipe(prefix({cascade: true}))
			.pipe(gif(gutil.env.sourcemaps, sourcemaps.write('./')))
			.pipe(gulp.dest(destPath)));
	});
	return streams;
})

gulp.task('css', function () {
	var streams = merge();
	paths.css.forEach(function (p) {
		var srcPath = path.join(rootPath, p.src),
			destPath = path.join(rootPath, p.dest);

		var includePaths = paths.includePaths.map(function(ip) {
				return path.join(rootPath, ip);
		});

		streams.add(gulp.src(srcPath + '*.scss')
			.pipe(gif(gutil.env.sourcemaps, sourcemaps.init()))
			.pipe(sass({
				includePaths: includePaths
			 }).on('error', sass.logError))
			.pipe(prefix({cascade: true}))
			.pipe(gif(gutil.env.sourcemaps, sourcemaps.write('./')))
			.pipe(gulp.dest(destPath)));
	});
	return streams;
});

var browserify = require('browserify');
var buffer = require('vinyl-buffer');
var source = require('vinyl-source-stream');
var watchify = require('watchify');
var xtend = require('xtend');

var watching = false;
gulp.task('enable-watch-mode', function () {watching = true;});

gulp.task('js', function () {
	paths.js.forEach(function (p) {

		var sourceFile = 'app.js';

		switch(p.module) {
			case 'default':
				sourceFile = 'app.js'; 
				break;
			case 'common':
				sourceFile = 'app-common.js';
				break;
			case 'page_designer':
				sourceFile = 'app-page-designer.js';
				break;
			default:
				sourceFile = 'app.js';
				break;
		}

		var opts = {
			entries: path.join(rootPath, p.src + sourceFile), // browserify requires relative path
			debug: gutil.env.sourcemaps
		};

		opts = xtend(opts, { 'debug': true }, argv.JenkinsNodeModulesPath ? { paths : [argv.JenkinsNodeModulesPath] } : {});

		if (watching) {
			opts = xtend(opts, watchify.args);
		}
		var bundler = browserify(opts);
		if (watching) {
			bundler = watchify(bundler);
		}
		// optionally transform
		// bundler.transform('transformer');

		bundler.on('update', function (ids) {
			gutil.log('File(s) changed: ' + gutil.colors.cyan(ids));
			gutil.log('Rebundling...');
			rebundle();
		});

		bundler.on('log', gutil.log);



		function rebundle () {
			return bundler.bundle()
				.on('error', function (e) {
					gutil.log('Browserify Error', gutil.colors.red(e));
				})
				.pipe(source(sourceFile))
				// sourcemaps
					.pipe(buffer())
					.pipe(sourcemaps.init({loadMaps: true}))
					.pipe(sourcemaps.write('./'))
				//
				.pipe(gulp.dest(path.join(rootPath, p.dest)));
		}
		return rebundle();
	})
});

var dwdav = require('dwdav');
var path = require('path');
var config = require('@tridnguyen/config');
var dw = null;
try {
  dw = require("./dw.json");
} catch(e) {
  gutil.log(gutil.colors.yellow("dw.json file is required for upload. See instructions in dw.json.example."));
}

function upload (files) {
	//gutil.log(gutil.colors.yellow('Hello upload 1...'));
	var credentials = config('dw.json', {caller: false});
	var server = dwdav(credentials);
	Promise.all(files.map(function (f) {
		return server.post(path.relative(process.cwd(), f));
	})).then(function() {
		gutil.log(gutil.colors.green('Uploaded ' + files.join(',') + ' to the server'));
	}).catch(function(err) {
		gutil.log(gutil.colors.red('Error uploading ' + files.join(','), err));
	});
}

var eslint = require('gulp-eslint');
gulp.task('lint', function() {
	return gulp.src('./**/*.js')
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
});

var webdriver = require('gulp-webdriver');
gulp.task('test:application', function () {
	return gulp.src('test/application/webdriver/wdio.conf.js')
		.pipe(webdriver(_.omit(opts, '_')));
});

var gulpMocha = require('gulp-mocha');
gulp.task('test:unit', function () {
	var reporter = opts.reporter || 'spec';
	var timeout = opts.timeout || 10000;
	var suite = opts.suite || '*';
	return gulp.src(['test/unit/' + suite + '/**/*.js'], {read: false})
		.pipe(gulpMocha({
			reporter: reporter,
			timeout: timeout
		}));
});

gulp.task('build', ['js', 'css','isml', 'bootstrap4']);

gulp.task('watch:server', function() {
    gulp.watch(['app_storefront_controllers/cartridge/**/*.{js,json,properties}',
                    'app_storefront_core/cartridge/**/*.{isml,json,properties,xml}',
                    'app_storefront_core/cartridge/scripts/**/*.{js,ds}',
                    'app_storefront_core/cartridge/static/**/*.{js,css,png,gif}',
                    'int_singlepagecheckout/cartridge/static/**/*.{js,css,png,gif}',
                    'app_storefront_pipelines/cartridge/**/*.{properties,xml}'], {}, function(event) {
                        upload([event.path]);
                    }
    );
});

gulp.task('default', ['enable-watch-mode', 'js', 'css', 'watch:server'], function () {
	gulp.watch(paths.css.map(function (path) {
		return path.src + '**/*.scss';
	}), ['css']);
});

var hbsfy = require('hbsfy');
var styleguideWatching = false;
gulp.task('styleguide-watching', function () {styleguideWatching = true;});
gulp.task('js:styleguide', function () {
	var opts = {
		entries: ['./styleguide/js/main.js'],
		debug: (gutil.env.sourcemaps)
	};
	if (styleguideWatching) {
		opts = Object.assign(opts, watchify.args);
	}
	var bundler = browserify(opts);
	if (styleguideWatching) {
		bundler = watchify(bundler);
	}

	// transforms
	bundler.transform(hbsfy);

	bundler.on('update', function (ids) {
		gutil.log('File(s) changed: ' + gutil.colors.cyan(ids));
		gutil.log('Rebundling...');
		bundle();
	});

	var bundle = function () {
		return bundler
			.bundle()
			.on('error', function (e) {
				gutil.log('Browserify Error', gutil.colors.red(e));
			})
			.pipe(source('main.js'))
			.pipe(gulp.dest('./styleguide/dist'));
	};
	return bundle();
});

var connect = require('gulp-connect');

gulp.task('connect:styleguide', function () {
	var port = opts.port || 8000;
	return connect.server({
		root: 'styleguide',
		port: port
	});
});

gulp.task('css:styleguide', function () {
	return gulp.src('styleguide/scss/*.scss')
		.pipe(sass())
		.pipe(prefix({cascade: true}))
		.pipe(gulp.dest('styleguide/dist'));
});

gulp.task('styleguide', ['styleguide-watching', 'js:styleguide', 'css:styleguide', 'connect:styleguide'], function () {
	var styles = paths.css.map(function (path) {
		return path.src + '**/*.scss';
	});
	styles.push('styleguide/scss/*.scss');
	gulp.watch(styles, ['css:styleguide']);
});

gulp.task('isml', function() {
	var htmlminOptions = {
    collapseWhitespace: true,
    includeAutoGeneratedTags: false
	};

	paths.isml.forEach(function(p) {
		gulp.src(path.join(rootPath, p), { base: './' })
			.pipe(htmlmin(htmlminOptions))
			.pipe(gulp.dest('./'));
	});
});

// deploy to github pages
var deploy = require('gulp-gh-pages');

gulp.task('deploy:styleguide', ['js:styleguide', 'css:styleguide'], function () {
	var options = Object.assign({cacheDir: 'styleguide/.tmp'}, require('./styleguide/deploy.json').options);
	return gulp.src(['styleguide/index.html', 'styleguide/dist/**/*', 'styleguide/lib/**/*'], {base: 'styleguide'})
		.pipe(deploy(options));
});
