const obj = { isOk: true, text: 'Hello', incream: 0 };

const depsTree = new WeakMap()

let effect = null

function registerEffect(fn) {
  const effectFn = () => {
    effect = effectFn
    fn()
  }
  effectFn()
}

function trace(target, prop) {
  let depsKeys = depsTree.get(target)
  if (!depsKeys) depsTree.set(target, depsKeys = new Map())
  let depsTraces = depsKeys.get(prop)
  if (!depsTraces) depsKeys.set(prop, depsTraces = new Set())
  if (effect) {
    depsTraces.add(effect)
  }
}

function trigger(target, prop) {
  let depsKeys = depsTree.get(target)
  if (!depsKeys) return
  let depsTraces = depsKeys.get(prop)
  if (!depsTraces) return
  depsTraces.forEach(fn => fn());
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
  document.getElementById('app').innerText = proxyObj.isOk && proxyObj.text
})