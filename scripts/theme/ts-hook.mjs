import { registerHooks } from 'node:module'
// The app imports its own modules without a file extension; Node needs one.
registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context) }
    catch (e) { if (specifier.startsWith('.')) return next(specifier + '.ts', context); throw e }
  },
})
