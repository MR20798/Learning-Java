// Maximilian Rode, 22972602
// Chang Liu, 22963247

public class Recursion {
    public static void main(String[] args) {
        //Test of countdown method
        System.out.println("Countdown von 5:");
        countdown(5);

        //Test of countup method
        System.out.println("Countup von 5:");
        countup(5);

        //Test of hornerRecursive method
        int[] digits = {1, 0, 1, 1}; //Example binary number: 1011
        int base = 2;
        int result = hornerRecursive(digits, base);
        System.out.println("Ergebnis der hornerRecursive Methode:");
        System.out.println(result); //Result should be 11

        //Test g-methods
        int i = 10;
        System.out.println("gNaive(" + i + "): " + gNaive(i));
        System.out.println("gTail(" + i + ") : " + gTail(i));
        System.out.println("gIter(" + i + "): " + gIter(i));
    }

    //Method for countdown
    public static void countdown(int n) {
        if (n < 0) {
            return;
        }
        System.out.println(n); //Output of the number
        countdown(n - 1); //Recursive Call
    }

    // Method for countup
    public static void countup(int n) {
        countupHelper(n, 0);
    }

    private static void countupHelper(int n, int current) {
        if (current > n) {
            return; //Terminal Condition
        }
        System.out.println(current);
        countupHelper(n, current + 1);
    }

    //Method for calculating the Decimal Number Using Horner's Scheme
    public static int hornerRecursive(int[] digits, int base) {
        return hornerHelper(digits, base, 0);
    }

    private static int hornerRecursive(int[] digits, int base, int index) {
        return hornerHelper(digits, base, 0);
    }

    private static int hornerHelper(int[] digits, int base, int index) {
        if (index == digits.length) {
            return 0; //Termination condition
        }
        return digits[index] + base * hornerRecursive(digits, base, index + 1);
    }

    //Recursive method gNaive
    public static long gNaive(int i) {
        if (i == 0) {
            return 0;
        }
        if (i == 1) {
            return 1;
        }
        return 2 * gNaive(i - 1) + 5 * gNaive(i - 2);
    }

    //Tail recursive method gTail
    public static long gTail(int i) {
        return gTailHelper(i, 1, 0);
    }

    public static long gTailHelper(int i, long giMinusOne, long giMinusTwo) {
        if (i == 0) {
            return giMinusTwo;
        }
        if (i == 1) {
            return giMinusOne;
        }
        return gTailHelper(i - 1, 2 * giMinusOne + 5 * giMinusTwo, giMinusOne);
    }

    //Iterative method gIter
    public static long gIter(int i) {
        if (i == 0) {
            return 0;
        }
        if (i == 1) {
            return 1;
        }
        long giMinusTwo = 0;
        long giMinusOne = 1;
        long g = 0;
        for (int j = 2; j <= i; j++) {
            g = 2 * giMinusOne + 5 * giMinusTwo;
            giMinusTwo = giMinusOne;
            giMinusOne = g;
        }
        return g;
    }
}