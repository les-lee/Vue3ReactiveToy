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

function computed(getter) {


  const effectFn = registerEffect(getter, {
    lazy: true,
  })

  const result = {
    get value() {
      return effectFn()
    }
  }
  return result
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

const currentComputed = computed(() => proxyObj.text + proxyObj.incream)

registerEffect(() => {
  console.log(currentComputed.value)
})