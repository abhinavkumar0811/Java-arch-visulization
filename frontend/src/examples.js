export const EXAMPLES = {
  'Exceptions & Try/Catch': `class InsufficientFundsException extends Exception {
    double amount;

    InsufficientFundsException(double amount) {
        this.amount = amount;
    }

    double getAmount() {
        return amount;
    }
}

class Account {
    String accountNumber;
    double balance;

    Account(String accountNumber, double balance) {
        this.accountNumber = accountNumber;
        this.balance = balance;
    }

    void deposit(double amount) {
        this.balance += amount;
    }

    void withdraw(double amount) throws InsufficientFundsException {
        if (amount > balance) {
            throw new InsufficientFundsException(amount - balance);
        }
        this.balance -= amount;
    }
}

class SavingsAccount extends Account {
    double interestRate;

    SavingsAccount(String accountNumber, double balance, double interestRate) {
        super(accountNumber, balance);
        this.interestRate = interestRate;
    }

    void applyInterest() {
        this.balance += this.balance * (interestRate / 100);
    }
}

class Main {
    static void transfer(Account from, Account to, double amount) {
        try {
            System.out.println("Initiating transfer of $" + amount);
            from.withdraw(amount);
            to.deposit(amount);
            System.out.println("Transfer successful!");
        } catch (InsufficientFundsException e) {
            System.out.println("Transfer failed! Short by $" + e.getAmount());
        }
    }

    public static void main(String[] args) {
        SavingsAccount acc1 = new SavingsAccount("ACC-101", 500.0, 5.0);
        Account acc2 = new Account("ACC-102", 200.0);

        acc1.applyInterest();
        System.out.println("Acc1 Balance after interest: $" + acc1.balance);

        // Successful Transfer
        transfer(acc1, acc2, 300.0);
        System.out.println("Acc1: $" + acc1.balance + ", Acc2: $" + acc2.balance);

        // Failed Transfer (Triggers Exception Allocation & Catch Frame)
        transfer(acc2, acc1, 1000.0);
    }
}
`,

  'Advanced OOP & Interfaces': `interface Executable {
    void execute();
}

class BaseTask implements Executable {
    String name = "BaseTask";
    int priority = 1;

    BaseTask(String name) {
        this.name = name;
    }

    public void execute() {
        System.out.println("Executing Base: " + getDetails());
    }

    String getDetails() {
        return name + " [Priority: " + priority + "]";
    }

    static void logType() {
        System.out.println("Type: BaseTask");
    }
}

class PriorityTask extends BaseTask {
    int priority = 10;

    PriorityTask(String name, int priority) {
        super(name);
        this.priority = priority;
    }

    String getDetails() {
        return super.name + " [SuperPriority: " + super.priority + ", LocalPriority: " + this.priority + "]";
    }

    static void logType() {
        System.out.println("Type: PriorityTask");
    }
}

class ScheduledTask extends PriorityTask {
    int delaySec;

    ScheduledTask(String name, int priority, int delaySec) {
        super(name, priority);
        this.delaySec = delaySec;
    }

    public void execute() {
        System.out.println("Scheduled in " + delaySec + "s -> " + getDetails());
    }
}

class Main {
    public static void main(String[] args) {
        Executable task1 = new ScheduledTask("BackupJob", 5, 30);
        BaseTask task2 = new PriorityTask("SyncJob", 8);

        task1.execute();
        task2.execute();

        System.out.println("Direct field access (task2.priority): " + task2.priority);

        BaseTask.logType();
        PriorityTask.logType();
        task2.logType();
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
    System.out.println("Starting Counter");

    Counter c = new Counter(10);
    for (int i = 0; i < 3; i++) {
      c.increment();
    }
    System.out.println(c.value);
  }
}
`,

  'OOP Inheritance': `class Shape {
  String type;
  Shape(String t) {
    this.type = t;
  }
  String describe() {
    return "Shape:" + this.type;
  }
}

class Circle extends Shape {
  int radius;
  Circle(int r) {
    super("Circle");
    this.radius = r;
  }
  int area() {
    return 3 * this.radius * this.radius;
  }
}

class Main {
  public static void main(String[] args) {
    Circle c = new Circle(5);
    System.out.println(c.describe());
    System.out.println(c.area());
  }
}
`,

  'Recursive Fibonacci': `class Main {
  static int fib(int n) {
    if (n <= 1) {
      return n;
    }
    return fib(n - 1) + fib(n - 2);
  }

  public static void main(String[] args) {
    int res = fib(5);
    System.out.println("Fib(5) = " + res);
  }
}
`,

  'Array Bubble Sort': `class Main {
  public static void main(String[] args) {
    int[] arr = new int[]{5, 3, 8, 1, 2};
    int n = arr.length;
    for (int i = 0; i < n; i++) {
      for (int j = 0; j < n - i - 1; j++) {
        if (arr[j] > arr[j + 1]) {
          int temp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = temp;
        }
      }
    }
    System.out.println("Sorted array:");
    for (int k = 0; k < n; k++) {
      System.out.println(arr[k]);
    }
  }
}
`,

  'Threads & Concurrency': `class Main {
  public static void main(String[] args) {
    System.out.println("main: thread start");

    new Thread(() -> {
      System.out.println("Worker thread executing task...");
    }).start();

    System.out.println("main: thread finish");
  }
}
`,

  'Math & String Helpers': `class Main {
  public static void main(String[] args) {
    int a = 14;
    int b = 28;
    int maxVal = Math.max(a, b);
    System.out.println("Max: " + maxVal);

    String message = "JVM Architecture Visualizer";
    System.out.println("Len: " + message.length());
    System.out.println(message.substring(0, 3));
  }
}
`
};

export const DEFAULT_EXAMPLE = 'Exceptions & Try/Catch';
