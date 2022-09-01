const obj = { isOk: true, text: 'Hello', incream: 0 };

const depsTree = new WeakMap()

let effect = null
let effectStack = []
function clearup(deps, effectFn) {
  deps.forEach(dep => {
    dep.delete(effectFn)
  })
}

function registerEffect(fn) {
  const effectFn = () => {
    clearup(effectFn.deps, effectFn)
    effect = effectFn
    effectStack.push(effect)
    fn()
    effectStack.pop()
    effect = effectStack[effectStack.length - 1]
  }
  effectFn.deps = []
  effectFn()
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
    // TODO:
    fn()
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

registerEffect(() => {
  console.log('commit 1')
  registerEffect(() => {
    console.log('commit 2')
  })
  proxyObj.incream++
})