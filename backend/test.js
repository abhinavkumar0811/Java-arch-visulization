const { interpret } = require('./lib/interpreter');

const sample = `
class Counter {
  int value;

  Counter(int start) {
    this.value = start;
  }

  void increment() {
    this.value = this.value + 1;
  }
}

class Main {
  static int square(int n) {
    return n * n;
  }

  public static void main(String[] args) {
    System.out.println("log 1");

    Counter c = new Counter(10);
    for (int i = 0; i < 3; i++) {
      c.increment();
    }
    System.out.println(c.value);

    int result = square(5);
    System.out.println(result);

    new Thread(() -> {
      System.out.println("hello from thread");
    }).start();

    System.out.println("log 2");
  }
}
`;

try {
  const trace = interpret(sample);
  console.log('Total steps:', trace.length);
  console.log('--- stdout ---');
  console.log(trace[trace.length - 1].stdout.join(''));
  console.log('--- sample event ---');
  console.log(JSON.stringify(trace[5], null, 2));
} catch (e) {
  console.error('FAILED:', e);
  process.exit(1);
}
