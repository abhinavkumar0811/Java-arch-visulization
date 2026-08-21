import React from 'react';

const INFO_CONTENT = {
  HEAP: {
    title: 'Heap Memory',
    icon: 'memory',
    color: 'text-heap',
    desc: 'The Heap is the runtime data area from which memory for all class instances and arrays is allocated.',
    details: [
      'Created on JVM start-up.',
      'Shared among all Java Virtual Machine threads.',
      'Garbage collection reclaims heap storage for objects no longer referenced.'
    ]
  },
  METHOD_AREA: {
    title: 'Method Area',
    icon: 'account_tree',
    color: 'text-method-area',
    desc: 'The Method Area stores per-class structures such as the run-time constant pool, field and method data, and the code for methods and constructors.',
    details: [
      'Shared among all threads.',
      'Logically part of the heap, but often managed differently depending on the JVM implementation.',
      'Throws OutOfMemoryError if memory cannot be allocated.'
    ]
  },
  CALL_STACK: {
    title: 'Call Stack',
    icon: 'layers',
    color: 'text-stack',
    desc: 'The Call Stack (Java Virtual Machine Stack) stores frames. A new frame is created each time a method is invoked.',
    details: [
      'Each thread has its own private JVM stack, created at the same time as the thread.',
      'A frame stores local variables, partial results, and plays a part in method return and exception dispatch.',
      'A frame is destroyed when its method invocation completes.'
    ]
  },
  PC_REGISTER: {
    title: 'PC Register',
    icon: 'data_array',
    color: 'text-pc-register',
    desc: 'The Program Counter (PC) Register contains the address of the Java Virtual Machine instruction currently being executed.',
    details: [
      'Each thread has its own PC register.',
      'If the current method is native, the value of the PC register is undefined.',
      'Directs the JVM on which bytecode instruction to execute next.'
    ]
  },
  THREADS: {
    title: 'Threads',
    icon: 'schema',
    color: 'text-primary',
    desc: 'A Thread is a thread of execution in a program. The JVM allows an application to have multiple threads of execution running concurrently.',
    details: [
      'Every thread has a priority. Threads with higher priority are executed in preference to threads with lower priority.',
      'Each thread maintains its own Call Stack and PC Register.',
      'All threads share the Heap and Method Area.'
    ]
  }
};

export default function InfoModal({ type, onClose }) {
  if (!type || !INFO_CONTENT[type]) return null;
  const content = INFO_CONTENT[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-border-subtle rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="bg-surface-container border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined ${content.color} text-[24px]`}>{content.icon}</span>
            <h2 className={`text-headline-md font-headline-md font-bold ${content.color}`}>{content.title}</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <p className="text-body-md text-on-surface leading-relaxed">
            {content.desc}
          </p>
          <div className="bg-surface-dim rounded-lg p-4 border border-border-subtle">
            <h3 className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider mb-2">Key Details</h3>
            <ul className="list-disc list-inside text-body-sm text-on-surface-variant space-y-1.5 marker:text-primary/50">
              {content.details.map((detail, idx) => (
                <li key={idx} className="leading-snug">{detail}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
