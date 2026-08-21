export const EXAMPLES = {
  'Default': `class Main {
  public static void main(String[] args) {
    // Write your custom code here
    System.out.println("Hello, World!");
  }
}
`,

  'Garbage Collection': `class Main {
  public static void main(String[] args) {
    // 1. Create an object
    Object myObj = new Object();
    
    // 2. The object is reachable via 'myObj'
    System.out.println("Object is active");
    
    // 3. Remove the reference
    myObj = null;
    
    // 4. The object is now unreachable and eligible for GC!
    System.out.println("Object is now garbage");
  }
}
`,

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

export const DEFAULT_EXAMPLE = 'Default';
