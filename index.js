#!/usr/bin/env node
'use strict'

var fs = require('fs')
var path = require('path')
var SLP = require('genie-slp')
var Palette = require('jascpal')
var meow = require('meow')
var mkdirp = require('mkdirp')
var PNG = require('pngjs').PNG

var cli = meow({
  help: [
    'Usage',
    '  $ slp-render <slp-file> <out-dir> [--palette=<file>] [--player=<number>] [--draw-outline]',
    '',
    'Options',
    '  --palette       JASC-PAL palette file path to get colours from. Defaults to',
    '                  the default Age of Empires 2 unit palette (50500).',
    '  -p, --player    Player colour to use for rendering units. Defaults to 1.',
    '  --draw-outline  Draw the outline around the unit instead of the unit itself.',
    '                  This is used by the games for rendering units behind buildings.',
    '',
    'Example',
    '  $ slp-render graphics.drs/2.slp archer/ --player=3',
    '  $ slp-render interfac.drs/50100.slp loading-background/ --palette=interfac.drs/50532.bin'
  ]
}, {
  alias: {
    p: 'player'
  }
})

var flags = cli.flags

var defaultPalette = path.join(__dirname, 'default-palette.pal')

// Player colours in SLPs are ordered slightly differently than in-game.
// particularly, orange is #5 in SLPs, but #7 in-game.
// this maps in-game colour indices to SLP colour indices.
var playerIdMap = {
  5: 6, // cyan
  6: 7, // magenta
  7: 5 // orange
}

// genie-slp returns alpha as a transparency value between 0-255, where higher
// is more transparent. PNG-js uses an opacity value, where higher is more
// *opaque*, so we have to invert that to get good results.
function invertAlpha (buffer) {
  var i = 0
    , l = buffer.length
  while (i < l) {
    buffer[i + 3] = 255 - buffer[i + 3]
    i += 4
  }
  return buffer
}

function run (file, outDir) {
  var slp = SLP(fs.readFileSync(file))
  var player = flags.player == null ? 1 : (playerIdMap[flags.player] || flags.player)
  var drawOutline = !!flags.drawOutline
  var palette = Palette(fs.readFileSync(flags.palette || defaultPalette, 'ascii'))
  if (slp.numFrames > 0) {
    mkdirp.sync(outDir)
  }
  for (var i = 0; i < slp.numFrames; i += 1) {
    var frame = slp.renderFrame(i, palette, {
      player: player,
      drawOutline: drawOutline
    })
    var png = new PNG({
      width: frame.width,
      height: frame.height
    })
    png.data = invertAlpha(frame.buffer)
    png.pack().pipe(
      fs.createWriteStream(path.join(outDir, i + '.png'))
    )
  }
}

if (cli.input.length < 2) {
  cli.showHelp()
  process.exit(0)
}

run(cli.input[0], cli.input[1] + '')
