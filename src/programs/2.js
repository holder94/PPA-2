function stock(bookId) {
  switch(bookId) {
    case 1:
      return 50
    case 2:
      return 1000
    default:
      return 200
  }
}

function price(bookId) {
  let p = 14;
  if (stock(bookId) < 100) {
    p = 19;
  } else if (stock(bookId) > 1000) {
    p = 9;
  }
  return p;
}