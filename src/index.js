const obj = { isOk: true, text: 'Hello', incream: 0 };

const depsSet = new Set()

let effect = null

function registerEffect(fn) {
  if (!effect) effect = fn

  effect()
}

const proxyObj = new Proxy(obj, {
  get(target, prop) {
    if (effect) depsSet.add(effect)
    return target[prop];
  },
  set(target, prop, value) {
    target[prop] = value
    depsSet.forEach(fn => fn())
    return true
  }
})

registerEffect(() => {
  document.getElementById('app').innerText = proxyObj.text
})