function price(bookId) {
  p = 14;
  if (stock(book_id) < 100) {
    p = 19;
  } else if (stock(book_id) > 1000) {
    p = 9;
  }
  return p;
}

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
