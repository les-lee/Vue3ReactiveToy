const obj = { isOk: true, text: 'Hello', incream: 0 };

const depsSet = new Set()

let effect = () => {
  document.querySelector('#app').innerText = proxyObj.text
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

effect()