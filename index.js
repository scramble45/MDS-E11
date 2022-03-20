#! /usr/bin/env node
const { SerialPort } = require('serialport')
const { InterByteTimeoutParser } = require('@serialport/parser-inter-byte-timeout')
const debug = require('debug')('MDS:')

let [cmd, state, track] = process.argv.slice(2)
if (cmd) cmd = cmd.replace(/-/gmi, '')
if (/on/i.test(state)) state = true
if (!state?.length) state = true
if (/off/i.test(state)) state = false

const port = new SerialPort({
  path: '/dev/ttyUSB0',
  baudRate: 9600,
  autoOpen: false,
  stopBits: 1,
  parity: 'none'
})

const parser = port.pipe(new InterByteTimeoutParser({interval: 60}))
const terminator = Buffer.from('00', 'hex')

port.open((err) => {if (err) return console.error(err.message)})
port.on('open', () => debug('- Sony MDS-E11 -\r\nSerial Connected...\r\n\n'))

const serialTX = function(data, pos, cb) {
  if (!pos) pos = 7 // a default

  data = Buffer.from(data)
  port.write(data, function (err) {
    if (err) return cb(err.message)
    if (!data) return cb('No data to parse')
    console.log('data:', data)
    parser.on('data', data => {
      port.flush()
      data = data

      // Example full 32 bytes recieved from deck
      // Remove header bytes and unused bytes
      // Data set between pipes, have to clean up header and 00 / ff

      // Track Name:
      // 6f 18 05 47 20 48 01 | 52 4f 4c 4c 49 4e 47 20 53 54 4f 4e 45 20 22 54 | ff 
      // 6f 18 05 47 20 49 02 | 55 52 4e 20 49 54 20 55 50 22 20 4d 44 00 00 00 | ff

      // Model Information:
      // 6f 15 05 47 20 22 | 4d 44 53 2d 45 31 31 | 00 00 00 00 00 00 00 ff

      debug('Serial Data:', data, '\n')

      let responseBuffer = []
      let cleanedBuffer = [] // sanatized data buffers
      let size = 24 // size of max message on return from deck

      if (data.length) {
        for (let i = 0; i < data.length; i += size) responseBuffer.push(data.slice(i, i + size))

        responseBuffer.forEach((value) => {
          cleanedBuffer.push(value.slice(pos, value.length - 1).toString('hex').replace(/00|ff]/gm, ''))
        })

        cleanedBuffer = cleanedBuffer.join('')
      }

      return cb(null, Buffer.from(cleanedBuffer, 'hex'))
    })
  })
}

switch (cmd) {
  case 'remote':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x10", state ? '0x03' : '0x04', "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Remote mode is now:', state ? 'on' : 'off')
      port.close()
    })
    break
  case 'power':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x01", state ? '0x02' : '0x03', "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug(`Setting power: ${state}`)
      port.close()
    })
    break
  case 'play':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x01", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Playing')
      port.close()
    })
    break
  case 'pause':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x03", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Paused')
      port.close()
    })
    break
  case 'stop':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x02", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Stopped')
      port.close()
    })
    break
  case 'ff_rew_off':
    serialTX(["0x7e", "0x06", "0x05", "0x47", "0x00", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('FF / REW off')
      port.close()
    })
    break
  case 'rew':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x13", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Toggled REW')
      port.close()
    })
    break
  case 'ff':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x14", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Toggles FF')
      port.close()
    })
    break
  case 'prev', 'previous':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x15", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Previous track')
      port.close()
    })
    break
  case 'next':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x16", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Next track')
      port.close()
    })
    break
  case 'rec':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x21", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Record started')
      port.close()
    })
    break
  case 'eject':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x02", "0x40", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Ejected Disc')
      port.close()
    })
    break
  case 'eraseAll':
    serialTX(["0x7e", "0x08", "0x05", "0x47", "0x0A", "0x04", "0x00", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Erased Disc')
      port.close()
    })
    break
  case 'model':
    serialTX(["0x7e", "0x07", "0x05", "0x47", "0x20", "0x22", "0xff"], 6, (err, result) => {
      if (err) console.error(err)
      debug('Model#', result.toString())
      port.close()
    })
    break
  case 'discName':
    serialTX(["0x7e", "0x08", "0x05", "0x47", "0x20", "0x48", "0x01", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Disc name:', result.toString())
      port.close()
    })
    break
  case 'trackName':
    if (!track) track = '0x01' // default track
    serialTX(["0x7e", "0x08", "0x05", "0x47", "0x20", "0x4A", `${track.toString(16)}`, "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('Track name:', result.toString())
      port.close()
    })
    break
  case 'allTrackNames':
    // TODO: Re-work this to work properly
    // this still needs some work, probably refactor main serialTX()
    serialTX(["0x7e", "0x08", "0x05", "0x47", "0x20", "0x4C", "0x01", "0xff"], null, (err, result) => {
      if (err) console.error(err)
      debug('All track names:', result.toString())
      port.close()
    })
    break
  default:
    debug('--help\n')
    port.close()
    process.exit(1)
}
