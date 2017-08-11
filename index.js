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
    '  $ slp-render <slp-file> [--inspect] [<out-dir>] [--palette=<file>] [--player=<number>] [--draw-outline]',
    '',
    'Options',
    '  --inspect       Show metadata about the file, like the size and the amount of frames.',
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
  },
  boolean: [
    'inspect'
  ]
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

function inspect (file) {
  var slp = SLP(fs.readFileSync(file))
  slp.parseHeader()

  var lines = [
    'Version: ' + slp.version,
    'Comment: ' + slp.comment,
    'Frames (' + slp.numFrames + '):'
  ]
  slp.frames.forEach(function (frame, i) {
    lines.push(
      '#' + i,
      '  Size: ' + frame.width + 'x' + frame.height,
      '  Center: ' + frame.hotspot.x + 'x' + frame.hotspot.y,
      '  Properties: ' + frame.properties
    )
  })

  lines.forEach(function (line) {
    console.log(line)
  })
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
    png.data = Buffer.from(frame.data.buffer)
    png.pack().pipe(
      fs.createWriteStream(path.join(outDir, i + '.png'))
    )
  }
}

function exit () {
  cli.showHelp()
  process.exit(1)
}

if (flags.inspect) {
  if (cli.input.length < 1) {
    exit()
  }
  inspect(cli.input[0])
} else if (cli.input.length < 2) {
  exit()
} else {
  run(cli.input[0], cli.input[1] + '')
}
