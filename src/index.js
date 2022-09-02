const obj = { isOk: true, text: 'Hello', incream: 0 };

const depsTree = new WeakMap()

let effect = null
let effectStack = []
function clearup(deps, effectFn) {
  deps.forEach(dep => {
    dep.delete(effectFn)
  })
}

function registerEffect(fn, options = {}) {
  const effectFn = () => {
    clearup(effectFn.deps, effectFn)
    effect = effectFn
    effect.fn = fn
    effectStack.push(effect)
    const res = fn()
    effectStack.pop()
    effect = effectStack[effectStack.length - 1]
    return res
  }
  effectFn.deps = []
  effectFn.options = options
  if (!options.lazy) effectFn()
  return effectFn
}

function trace(target, prop) {
  let depsKeys = depsTree.get(target)
  if (!depsKeys) depsTree.set(target, depsKeys = new Map())
  let depsTraces = depsKeys.get(prop)
  if (!depsTraces) depsKeys.set(prop, depsTraces = new Set())
  if (effect) {
    depsTraces.add(effect)
    effect.deps.push(depsTraces)
  }
}

function trigger(target, prop) {
  let depsKeys = depsTree.get(target)
  if (!depsKeys) return
  let depsTraces = depsKeys.get(prop)
  if (!depsTraces) return
  new Set(depsTraces).forEach(fn => {
    if (effect !== fn) {
      if (fn.options.scheduler) fn.options.scheduler(fn)
      else fn()
    }
  });
}



const proxyObj = new Proxy(obj, {
  get(target, prop) {
    trace(target, prop)
    return target[prop];
  },
  set(target, prop, value) {
    target[prop] = value
    trigger(target, prop)
    return true
  }
})

function asyncScheduler(fn) {
  Promise.resolve().then(fn)
}

const flushScheduler = (function () {
  let flushing = false
  let flushingQueue = new Set()
  return (fn) => {
    if (flushing) {
      flushingQueue.add(fn)
    } else {
      flushing = true
      Promise.resolve().then(() => {
        flushingQueue.forEach(fn => fn())
      }).finally(() => flushing = false)
    }
  }
})()


function computed(getter) {

  const effectFn = registerEffect(getter, {
    lazy: true,
    scheduler: fn => {
      if (!needUpdate) {
        needUpdate = true
        trigger(result, 'value')
      }
    }
  })

  let value
  let needUpdate = true
  const result = {
    get value() {
      trace(result, 'value')
      if (needUpdate) {
        needUpdate = false
        value = effectFn()
      }

      return value
    }
  }
  return result
}

function traverse(target) {
  if (['', null, undefined].includes(target) || typeof target !== 'object') return
  for (const key in target) {
    traverse(target[key])
  }
}

function watch(getter, callback, options = {}) {
  let getterFn = typeof getter === 'function' ? getter : () => traverse(getter)
  let oldValue
  function iCallback() {
    const newValue = effectFn()
    callback(oldValue, newValue)
    oldValue = newValue
  }
  const effectFn = registerEffect(() => getterFn(), {
    lazy: true,
    scheduler: iCallback
  })
  if (options.immediately) iCallback()
  else oldValue = effectFn()
}

watch(() => proxyObj.text + proxyObj.incream, (nv, ov) => {
  console.log('commit 1', nv, ov)
}, {
  immediately: true
})