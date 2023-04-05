let x = 5;

function factorial(n) {
    if (n === 0) {
        return 1;
    }
    let result = n * factorial(n - 1);
    return result;
}

factorial(x);
