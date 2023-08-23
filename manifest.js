import Confidence from '@hapipal/confidence'

const actuators = [
  {
    index: '00000001',
    label: 'cuisine',
    buttonAddress: '00001001',
    buttonKey: '70000000'
  },
  {
    index: '00000002',
    label: 'hotte',
    buttonAddress: '00001002',
    buttonKey: '50000000'
  },
  {
    index: '00000003',
    label: 'salon',
    buttonAddress: '00001003',
    buttonKey: '30000000'
  },
  {
    index: '00000004',
    label: 'salle_a_manger',
    buttonAddress: '00001004',
    buttonKey: '10000000'
  },
  {
    index: '00000005',
    label: 'evier',
    buttonAddress: '00001005',
    buttonKey: '70000000'
  },
  {
    index: '00000006',
    label: 'porte_entree',
    buttonAddress: '00001006',
    buttonKey: '70000000'
  },
  {
    index: '00000007',
    label: 'hall_bas',
    buttonAddress: '00001007',
    buttonKey: '70000000'
  },
  {
    index: '00000008',
    label: 'wc',
    buttonAddress: '00001008',
    buttonKey: '70000000'
  },
  {
    index: '00000009',
    label: 'bureau',
    buttonAddress: '00001009',
    buttonKey: '70000000'
  },
  {
    index: '0000000a',
    label: '_',
    buttonAddress: '00001010',
    buttonKey: '70000000'
  },
  {
    index: '0000000b',
    label: 'hall_haut',
    buttonAddress: '00001011',
    buttonKey: '70000000'
  },
  {
    index: '0000000c',
    label: 'chambres_amis',
    buttonAddress: '00001012',
    buttonKey: '70000000'
  },
  {
    index: '0000000d',
    name: 'garage',
    buttonAddress: '00001013',
    buttonKey: '30000000'
  },
  {
    index: '0000000e',
    label: 'local_technique',
    buttonAddress: '00001014',
    buttonKey: '10000000'
  },
  {
    index: '0000000f',
    label: 'chambre',
    buttonAddress: '00001015',
    buttonKey: '70000000'
  },
  {
    index: '00000010',
    label: 'salle_de_bain',
    buttonAddress: '00001016',
    buttonKey: '50000000'
  }
]

export default async function () {
  return new Confidence.Store({
    server: {
      address: {
        $env: 'ELTAKO_BIND_ADDRESS',
        $default: '0.0.0.0'
      },
      port: {
        $env: 'ELTAKO_PORT',
        $default: 8080
      },
      debug: {
        request: ['error', 'uncaught']
      }
    },
    register: {
      plugins: [
        {
          plugin: '@hapi/inert'
        },
        {
          plugin: '@hapi/vision'
        },
        {
          plugin: 'hapi-swagger'
        },
        {
          plugin: 'blipp'
        },
        {
          plugin: 'laabr',
          options: {
            handleUncaught: true,
            formats: {
              onPostStart: '[:time[iso]][:level] :message at: :host[uri]',
              onPostStop: '[:time[iso]][:level] :message at: :host[uri]',
              request: '[:time[iso]][:level] :message [:requestId]',
              response: '[:time[iso]] :method :remoteAddress :url :status :payload (:responseTime ms) [:requestId]',
              log: '[:time[iso]][:level] :message :tags',
              uncaught: '{ error::error, timestamp::time, level::level, environment::environment, stack::error[stack] }',
              'request-error': '{ error::error, timestamp::time, level::level, environment::environment, stack::error[stack] }'
            }
          }
        },
        {
          plugin: await import('./src/eltako/index.js'),
          options: {
            tty: {
              $env: 'ELTAKO_TTY_PATH',
              $default: '/dev/ttyUSB1'
            },
            baudRate: {
              $env: 'ELTAKO_TTY_PATH',
              $default: 57600,
              $coerce: 'number'
            },
            actuators: {
              $env: 'ELTAKO_ACTUATORS',
              $default: actuators,
              $coerce: 'object'
            }
          }
        }
      ]
    }
  })
}
