export const EXAMPLES = {
  'Objects & Heap': `class Counter {
  int value;

  Counter(int start) {
    this.value = start;
  }

  void increment() {
    this.value = this.value + 1;
  }
}

class Main {
  public static void main(String[] args) {
    System.out.println("Starting");

    Counter c = new Counter(10);
    for (int i = 0; i < 3; i++) {
      c.increment();
    }
    System.out.println(c.value);
  }
}
`,

  'Method Calls & Stack': `class Main {
  static int factorial(int n) {
    if (n <= 1) {
      return 1;
    }
    return n * factorial(n - 1);
  }

  public static void main(String[] args) {
    int result = factorial(5);
    System.out.println(result);
  }
}
`,

  'Threads': `class Main {
  public static void main(String[] args) {
    System.out.println("main: before start");

    new Thread(() -> {
      System.out.println("worker: running");
    }).start();

    System.out.println("main: after start");
  }
}
`,

  'Loops & Arithmetic': `class Main {
  public static void main(String[] args) {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
      sum = sum + i;
      System.out.println(sum);
    }
    boolean isEven = sum % 2 == 0;
    System.out.println(isEven);
  }
}
`
};

export const DEFAULT_EXAMPLE = 'Objects & Heap';
