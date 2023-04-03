function wrapper() {
  const func = ((arg) => {
    let a = 2
    a++
    return a
  })()

  let a = 1, b = func
  if (b > 1) {
    a = a + 2
  }


}