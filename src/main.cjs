'use strict'

const App = require('./App.jsx').default

// Shape returned to window.__ModuleLoader__ — see build.mjs for the wrapper.
module.exports = {
  inject: ['slots'],
  apply(ctx) {
    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'quick-explain',
      order: 50,
    }, App))
  },
}
