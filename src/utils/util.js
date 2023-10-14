function debounce(fn, delay, immediate = false) { 
  let isInvoke = false
  let timer = null
  const _debounce = function (...args) { 
    return new Promise((resolve, reject) => {
      if (immediate && !isInvoke) {
        try {
          const result = fn.apply(this, args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
        isInvoke = true
      } else { 
        timer && clearTimeout(timer)
        timer = setTimeout(() => { 
          try {
            const result = fn.apply(this, args)
            resolve(result)
          } catch (error) {
            reject(error)
          }
          isInvoke = false
        }, delay)
      }
    })
  }

  // 封装取消功能
  const cancel = function () { 
    if (timer) clearTimeout(timer)
    timer = null
    isInvoke = false
  }

  return [_debounce, cancel]
}

module.exports = {
  debounce
}