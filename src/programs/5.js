function fibonacci(n) {
    if (n <= 1) {
        return n;
    }
    let fib1 = 0;
    let fib2 = 1;
    let fibn;
    for (let i = 2; i <= n; i++) {
        fibn = fib1 + fib2;
        fib1 = fib2;
        fib2 = fibn;
    }
    return fibn;
}

let y = 7;
fibonacci(y);