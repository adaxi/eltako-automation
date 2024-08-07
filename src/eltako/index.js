'use strict'

// https://roelofjanelsinga.com/articles/how-to-create-switch-dashboard-home-assistant/
// https://cedalo.com/blog/mosquitto-docker-configuration-ultimate-guide/

import Boom from '@hapi/boom'
import { SerialPort } from 'serialport'

import { UsbParser, PACKET_PROCESSED, ACTUATOR_STATE } from './usb-parser.js'
import { UsbSender } from './usb-sender.js'
import { RadioSender } from './radio-sender.js'
import { RadioParser } from './radio-parser.js'
import { Actuator, ACTUATOR_STATE_CHANGE } from './actuator.js'
import { HA_ONLINE, STATE_CHANGE_REQUEST, HaMqtt } from './ha-mqtt.js'

export const plugin = {
  name: 'eltako',
  version: '1.0.0',
  register: async (server, options) => {
    let ha
    let usbSerialPort
    let radioSerialPort
    let usbSender
    let usbParser
    let radioSender
    let radioParser
    const actuators = []

    setInterval(async () => {
      try {
        await ha?.provision(actuators)
        await ha?.publishAll(actuators)
      } catch (err) {
        server.log(['error'], 'Failed to provision home assistant:' + err)
      }
    }, 1 /* h */ * 60 /* m */ * 60 /* s */ * 1000 /* ms */)

    server.ext([
      {
        type: 'onPostStart',
        method: async () => {
          try {
            ha = new HaMqtt(options.mqttUrl)
            await ha.init()

            usbSerialPort = new SerialPort({
              path: options.usb.tty,
              baudRate: options.usb.baudRate
            })

            radioSerialPort = new SerialPort({
              path: options.radio.tty,
              baudRate: options.radio.baudRate
            })

            radioSender = new RadioSender(radioSerialPort)
            await radioSender.init()

            // radioParser = new RadioParser(radioSerialPort)
            // await radioParser.init()

            usbSender = new UsbSender(usbSerialPort)
            usbParser = new UsbParser(usbSerialPort)

            await usbParser.init()

            usbParser.on(PACKET_PROCESSED, () => {
              usbSender.processQueue()
            })

            usbParser.on(ACTUATOR_STATE, ({ index, state }) => {
              try {
                server.log(['trace', 'usb-parser'], `Actuator with index '${index}' was triggered to state ${state ? 'ON' : 'OFF'}`)
                const actuator = actuators.find(a => a.index === index)
                if (actuator) {
                  server.log(['trace', 'usb-parser'], `Updating actuator '${actuator.label}' was triggered to state ${state ? 'ON' : 'OFF'}`)
                  actuator.state = state
                } else {
                  server.log(['trace', 'usb-parser'], `No actuator with index '${index}' was found.`)
                }
              } catch (err) {
                server.log(['error'], `Failed to update actuator state: ${err}`)
              }
            })

            const stateChangeHandler = async function () {
              const actuator = this
              try {
                await ha.publish(actuator)
                server.log(['error'], `Published actuator '${actuator.label}' to '${actuator.state ? 'ON' : 'OFF'}' change on MQTT.`)
              } catch (err) {
                server.log(['error'], `Failed to publish state for '${actuator.label}' to '${actuator.state ? 'ON' : 'OFF'}' change on MQTT.`)
              }
            }

            for (const actuatorCfg of structuredClone(options.actuators)) {
              const {
                index,
                label,
                usbCfg,
                radioCfg
              } = actuatorCfg
              const actuator = new Actuator(index, label, { usbCfg, radioCfg, usbSender, radioSender })
              actuator.on(ACTUATOR_STATE_CHANGE, stateChangeHandler)
              actuators.push(actuator)
            }

            ha.on(STATE_CHANGE_REQUEST, async ({ label, state }) => {
              const actuator = actuators.find(a => a.label === label)
              if (!actuator) {
                return
              }
              if (actuator.state !== state) {
                actuator.toggle()
              }
            })

            ha.on(HA_ONLINE, async () => {
              await ha.provision(actuators)
            })

            await ha.subscribeAll(actuators)
            server.log(['info'], `Subscribed to ${actuators.length} actuators`)
            await ha.provision(actuators)
            server.log(['info'], `Provisioned ${actuators.length} actuators into home assistant`)
          } catch (err) {
            console.log(err)
            server.log(['error'], `Failed to startup. Exiting.`)
            process.exit(1)
          }
        }
      },
      {
        type: 'onPreStop',
        method: async () => {
          if (usbSerialPort) {
            try {
              await new Promise((resolve, reject) => usbSerialPort.close((err) => err ? reject(err) : resolve()))
            } catch (err) {
              server.log(['error'], 'Failed to close serial port.')
            }
          }
          if (radioSerialPort) {
            try {
              await new Promise((resolve, reject) => radioSerialPort.close((err) => err ? reject(err) : resolve()))
            } catch (err) {
              server.log(['error'], 'Failed to close serial port.')
            }
          }
          if (ha) {
            ha.removeAllListeners()
            try {
              await ha.stop()
            } catch (err) {
              server.log(['error'], 'Failed to mqtt client.')
            }
          }
          if (usbParser) {
            usbParser.removeAllListeners()
          }
        }
      }
    ])

    server.route({
      path: '/publish-home-assistant',
      method: 'POST',
      async handler (request, h) {
        await ha?.provision(actuators)
        return h.response().code(204)
      }
    })

    server.route({
      path: '/actuators',
      method: 'GET',
      async handler (request, h) {
        return actuators
      }
    })

    server.route({
      path: '/actuators/{label}/toggle',
      method: 'POST',
      async handler (request, h) {
        const { label } = request.params
        const actuator = actuators.find(actuator => actuator.label === label)
        if (!actuator) {
          throw Boom.notFound('No actuator found at that index')
        }
        await actuator.toggle()
        return h.response().code(204)
      }
    })

    server.route({
      path: '/actuators/{label}/set/{state}',
      method: 'POST',
      async handler (request, h) {
        const { label, state } = request.params
        const actuator = actuators.find(actuator => actuator.label === label)
        if (!actuator) {
          throw Boom.notFound('No actuator found at that index')
        }
        if ((actuator.state && state === '0') || (!actuator.state && state === '1')) {
          await actuator.toggle()
        }
        return h.response().code(204)
      }
    })
  }
}
