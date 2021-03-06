'use strict'

/**
 * FUSEBOX
 *
 * Client & Server compiler / bundler / watcher
 */

const colors = require('colors/safe')
const fsbx = require('fuse-box')
const nodemon = require('nodemon')

// ======================================================
// Parse cmd arguments
// ======================================================

const args = require('yargs')
  .option('d', {
    alias: 'dev',
    describe: 'Start in Developer mode',
    type: 'boolean'
  })
  .option('c', {
    alias: 'dev-configure',
    describe: 'Start in Configure Developer mode',
    type: 'boolean'
  })
  .help('h')
  .alias('h', 'help')
  .argv

let mode = 'build'
const dev = args.d || args.c
if (args.d) {
  console.info(colors.bgWhite.black(' Starting Fuse in DEVELOPER mode... '))
  mode = 'dev'
} else if (args.c) {
  console.info(colors.bgWhite.black(' Starting Fuse in CONFIGURE DEVELOPER mode... '))
  mode = 'dev-configure'
} else {
  console.info(colors.bgWhite.black(' Starting Fuse in BUILD mode... '))
}

// ======================================================
// BUILD VARS
// ======================================================

const ALIASES = {
  'brace-ext-modelist': 'brace/ext/modelist.js',
  'simplemde': 'simplemde/dist/simplemde.min.js',
  'socket-io-client': 'socket.io-client/dist/socket.io.js',
  'vue': (dev) ? 'vue/dist/vue.js' : 'vue/dist/vue.min.js',
  'vue-lodash': 'vue-lodash/dist/vue-lodash.min.js'
}
const SHIMS = {
  _preinit: {
    source: '.build/_preinit.js',
    exports: '_preinit'
  },
  jquery: {
    source: 'node_modules/jquery/dist/jquery.js',
    exports: '$'
  },
  mathjax: {
    source: 'node_modules/mathjax/MathJax.js',
    exports: 'MathJax'
  }
}

// ======================================================
// Global Tasks
// ======================================================

console.info(colors.white('└── ') + colors.green('Running global tasks...'))
let globalTasks = require('./.build/_tasks')

// ======================================================
// Fuse Tasks
// ======================================================

globalTasks.then(() => {
  let fuse = fsbx.FuseBox.init({
    homeDir: './client',
    output: './assets/js/$name.min.js',
    alias: ALIASES,
    shim: SHIMS,
    plugins: [
      fsbx.EnvPlugin({ NODE_ENV: (dev) ? 'development' : 'production' }),
      fsbx.VuePlugin(),
      ['.scss', fsbx.SassPlugin({ outputStyle: (dev) ? 'nested' : 'compressed' }), fsbx.CSSPlugin()],
      fsbx.BabelPlugin({ comments: false, presets: ['es2015'] }),
      fsbx.JSONPlugin(),
      !dev && fsbx.UglifyESPlugin({
        compress: { unused: false },
        output: { 'max_line_len': 1000000 }
      })
    ],
    debug: false,
    log: true
  })

  if (dev) {
    fuse.dev({
      port: 4444,
      httpServer: false
    })
  }

  const bundleApp = fuse.bundle('app').instructions('> index.js')
  const bundleSetup = fuse.bundle('configure').instructions('> configure.js')

  switch (mode) {
    case 'dev':
      bundleApp.watch()
      break
    case 'dev-configure':
      bundleSetup.watch()
      break
  }

  fuse.run().then(() => {
    console.info(colors.green.bold('\nAssets compilation + bundling completed.'))

    if (dev) {
      nodemon({
        exec: (args.d) ? 'node server' : 'node wiki configure',
        ignore: ['assets/', 'client/', 'data/', 'repo/', 'tests/'],
        ext: 'js json',
        watch: (args.d) ? ['server'] : ['server/configure.js'],
        env: { 'NODE_ENV': 'development' }
      })
    }
  }).catch(err => {
    console.error(colors.red(' X Bundle compilation failed! ' + err.message))
    process.exit(1)
  })
})
