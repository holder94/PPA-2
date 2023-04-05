function f(x) {
  let a = 0
  if (x > 5) {
    a = 10
  }

  while(x > 0) {
    a += x
    x--
  }

  return a + 10
}
