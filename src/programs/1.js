let a = 1

function foo(first, second = 4, ...rest) {
  let a = 2, c = 3
  let b = 1

  if (b < 3) {
    a += 3
  } else {
    a = 5
  }

  for (let i = 0;;i++) {
    b = 1
  }
  a = a + 3

  a++
  const array = [] 
  return rest
}
