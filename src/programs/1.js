let a = 1
a = 2

foo(a)

function foo(first, second = 4, ...rest) {
  let a = 2, c = 3
  let b = 1

  if (b < 3) {
    let a = 1
    a += 3
  } else if (a < 8) {}

  if (a > 4) {
    a = 6
  } else {}

  for (let i = 0; i < 5;i++) {
    b = 1
  }
  a = a + 3

  a++
  const array = [] 

  // const array1 = array.concat(array)
  return a + c
}

// foo(a)
