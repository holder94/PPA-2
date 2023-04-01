function discount(price) {
  let d = 0.8

  if (price < 14.99) {
    d = 0.9
  } else if (price < 19.99) {
    d += 0.1
  } else {
    d = 0
    for (let i = 0; i < 5; i++) {
      d += 0.18
    }
  }

  return price * d
}
