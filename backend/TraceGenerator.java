import com.sun.jdi.*;
import com.sun.jdi.connect.Connector;
import com.sun.jdi.connect.LaunchingConnector;
import com.sun.jdi.event.*;
import com.sun.jdi.request.*;

import java.util.*;
import java.util.stream.Collectors;
import java.io.*;

public class TraceGenerator {
    private static VirtualMachine vm;
    private static int stepCount = 0;
    private static Map<Long, ObjectReference> allKnownObjects = new HashMap<>();
    private static Map<Long, String> stringPool = new HashMap<>();
    private static List<String> stdoutBuffer = Collections.synchronizedList(new ArrayList<>());
    
    // Caches to heavily reduce JDI IPC overhead
    private static Map<ReferenceType, Boolean> classIsUserCache = new HashMap<>();
    private static Map<ReferenceType, String> classJsonCache = new HashMap<>();
    private static Map<ReferenceType, List<Field>> classFieldsCache = new HashMap<>();

    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.err.println("Usage: java TraceGenerator [--serverless] <MainClass>");
            System.exit(1);
        }
        
        boolean serverless = false;
        String mainClass = args[0];
        
        if (args[0].equals("--serverless")) {
            serverless = true;
            mainClass = args[1];
            
            // Programmatic Compilation
            javax.tools.JavaCompiler compiler = javax.tools.ToolProvider.getSystemJavaCompiler();
            if (compiler != null) {
                int res = compiler.run(null, null, System.err, "-g", mainClass + ".java");
                if (res != 0) {
                    System.err.println("Compilation failed for " + mainClass + ".java");
                    System.exit(1);
                }
            }
            
            // Programmatic Javap
            String bytecode = "";
            java.util.spi.ToolProvider javap = java.util.spi.ToolProvider.findFirst("javap").orElse(null);
            if (javap != null) {
                StringWriter sw = new StringWriter();
                PrintWriter pw = new PrintWriter(sw);
                javap.run(pw, pw, "-c", "-p", mainClass);
                bytecode = sw.toString();
            }
            
            System.out.println("{");
            System.out.println("  \"bytecode\": \"" + escape(bytecode) + "\",");
            System.out.println("  \"trace\": [");
        } else {
            System.out.println("[");
        }

        LaunchingConnector launchingConnector = Bootstrap.virtualMachineManager().defaultConnector();
        Map<String, Connector.Argument> env = launchingConnector.defaultArguments();
        env.get("main").setValue(mainClass);

        vm = launchingConnector.launch(env);
        
        // Capture stdout
        Process process = vm.process();
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    stdoutBuffer.add(line);
                }
            } catch (IOException e) {}
        }).start();
        
        // Capture stderr
        new Thread(() -> {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    stdoutBuffer.add(line);
                }
            } catch (IOException e) {}
        }).start();

        EventRequestManager erm = vm.eventRequestManager();

        ClassPrepareRequest cpr = erm.createClassPrepareRequest();
        cpr.addClassFilter(mainClass);
        cpr.enable();
        
        ExceptionRequest exReq = erm.createExceptionRequest(null, false, true); // Catch uncaught exceptions
        exReq.enable();

        MethodExitRequest mer = erm.createMethodExitRequest();
        mer.addClassFilter(mainClass);
        mer.enable();

        boolean first = true;
        while (true) {
            EventQueue eventQueue = vm.eventQueue();
            EventSet eventSet = eventQueue.remove();
            for (Event event : eventSet) {
                if (event instanceof ClassPrepareEvent) {
                    ClassPrepareEvent cpe = (ClassPrepareEvent) event;
                    ThreadReference thread = cpe.thread();
                    StepRequest stepReq = erm.createStepRequest(thread, StepRequest.STEP_LINE, StepRequest.STEP_INTO);
                    stepReq.addClassFilter(mainClass); // Only step into user code
                    stepReq.enable();
                } else if (event instanceof StepEvent) {
                    StepEvent se = (StepEvent) event;
                    if (!first) System.out.println(",");
                    first = false;
                    dumpState(se.thread(), "Executed line");
                    
                    try {
                        if (se.thread().frameCount() > 50) {
                            System.out.println(",");
                            dumpState(se.thread(), "Exception: java.lang.StackOverflowError");
                            if (serverless) { System.out.println("\n  ]\n}"); } else { System.out.println("\n]"); }
                            try { vm.exit(0); } catch (Exception ignore) {}
                            System.exit(0);
                        }
                    } catch (IncompatibleThreadStateException ignore) {}

                    if (stepCount >= 1000) {
                        if (serverless) { System.out.println("\n  ]\n}"); } else { System.out.println("\n]"); }
                        try { vm.exit(0); } catch (Exception ignore) {}
                        System.exit(0);
                    }
                } else if (event instanceof MethodExitEvent) {
                    MethodExitEvent mee = (MethodExitEvent) event;
                    if (mee.method().name().equals("main")) {
                        if (!first) System.out.println(",");
                        first = false;
                        // Give stream a tiny moment to flush
                        try { Thread.sleep(50); } catch (InterruptedException ignore) {}
                        dumpState(mee.thread(), "Program Finished");
                    }
                } else if (event instanceof ExceptionEvent) {
                    ExceptionEvent ee = (ExceptionEvent) event;
                    if (!first) System.out.println(",");
                    first = false;
                    
                    // Give streams a moment to flush the stack trace
                    try { Thread.sleep(50); } catch (InterruptedException ignore) {}
                    
                    try {
                        dumpState(ee.thread(), "Exception: " + ee.exception().referenceType().name());
                    } catch (Exception ignore) {}
                    
                    if (serverless) { System.out.println("\n  ]\n}"); } else { System.out.println("\n]"); }
                    try { vm.exit(0); } catch (Exception ignore) {}
                    System.exit(0);
                } else if (event instanceof VMDeathEvent || event instanceof VMDisconnectEvent) {
                    // Give streams a moment to flush before exiting
                    try { Thread.sleep(50); } catch (InterruptedException ignore) {}
                    if (serverless) { System.out.println("\n  ]\n}"); } else { System.out.println("\n]"); }
                    System.exit(0);
                }
            }
            eventSet.resume();
        }
    }

    private static void dumpState(ThreadReference currentThread, String description) {
        stepCount++;
        
        StringBuilder json = new StringBuilder();
        json.append("  {\n");
        json.append("    \"step\": ").append(stepCount).append(",\n");
        json.append("    \"type\": \"STEP\",\n");
        json.append("    \"description\": \"").append(escape(description)).append("\",\n");
        json.append("    \"threadId\": \"").append(currentThread != null ? currentThread.uniqueID() : "").append("\",\n");
        
        // Copy current stdout state
        List<String> currentStdout;
        synchronized(stdoutBuffer) {
            currentStdout = new ArrayList<>(stdoutBuffer);
        }
        json.append("    \"stdout\": [");
        for (int i = 0; i < currentStdout.size(); i++) {
            if (i > 0) json.append(",");
            json.append("\"").append(escape(currentStdout.get(i))).append("\"");
        }
        json.append("],\n");
        json.append("    \"methodArea\": {\n");
        boolean firstClass = true;
        for (ReferenceType refType : vm.allClasses()) {
            Boolean isUser = classIsUserCache.get(refType);
            if (isUser == null) {
                String cname = refType.name();
                isUser = !(cname.startsWith("java.") || cname.startsWith("javax.") || cname.startsWith("sun.") || cname.startsWith("jdk.") || cname.startsWith("com.sun.") || cname.contains("$"));
                classIsUserCache.put(refType, isUser);
            }
            
            if (!isUser) continue;
            
            if (!firstClass) json.append(",\n");
            firstClass = false;
            
            String cachedJson = classJsonCache.get(refType);
            if (cachedJson == null) {
                StringBuilder cjson = new StringBuilder();
                String cname = refType.name();
                cjson.append("      \"").append(escape(cname)).append("\": {\n");
                cjson.append("        \"name\": \"").append(escape(cname)).append("\",\n");
                
                cjson.append("        \"fields\": [");
                boolean firstF = true;
                try {
                    for (Field f : refType.allFields()) {
                        if (!firstF) cjson.append(",");
                        firstF = false;
                        cjson.append("{\"name\": \"").append(escape(f.name())).append("\", \"type\": \"").append(escape(f.typeName())).append("\"}");
                    }
                } catch (Exception e) {}
                cjson.append("],\n");
                
                cjson.append("        \"methods\": [");
                boolean firstM = true;
                try {
                    for (Method m : refType.allMethods()) {
                        if (m.name().startsWith("<")) continue;
                        if (!firstM) cjson.append(",");
                        firstM = false;
                        cjson.append("{\"name\": \"").append(escape(m.name())).append("\"}");
                    }
                } catch (Exception e) {}
                cjson.append("]\n");
                cjson.append("      }");
                cachedJson = cjson.toString();
                classJsonCache.put(refType, cachedJson);
            }
            json.append(cachedJson);
        }
        json.append("\n    },\n");
        
        // Extract Threads & Stack
        json.append("    \"threads\": {\n");
        Set<Long> reachableObjects = new HashSet<>();
        
        boolean firstThread = true;
        for (ThreadReference thread : vm.allThreads()) {
            if (!thread.name().equals("main") && !thread.name().startsWith("Thread-")) continue;
            
            if (!firstThread) json.append(",\n");
            firstThread = false;
            
            json.append("      \"").append(thread.uniqueID()).append("\": {\n");
            json.append("        \"id\": \"").append(thread.uniqueID()).append("\",\n");
            json.append("        \"name\": \"").append(escape(thread.name())).append("\",\n");
            json.append("        \"status\": \"RUNNING\",\n");
            json.append("        \"callStack\": [\n");
            
            try {
                if (thread.isSuspended()) {
                    boolean firstFrame = true;
                    // Reverse to match frontend (bottom to top)
                    List<StackFrame> frames = new ArrayList<>(thread.frames());
                    Collections.reverse(frames);
                    
                    for (StackFrame frame : frames) {
                        if (!firstFrame) json.append(",\n");
                        firstFrame = false;
                        
                        json.append("          {\n");
                        json.append("            \"className\": \"").append(escape(frame.location().declaringType().name())).append("\",\n");
                        json.append("            \"method\": \"").append(escape(frame.location().method().name())).append("\",\n");
                        json.append("            \"line\": ").append(frame.location().lineNumber()).append(",\n");
                        json.append("            \"vars\": {");
                        
                        boolean firstVar = true;
                        try {
                            for (LocalVariable var : frame.visibleVariables()) {
                                Value val = frame.getValue(var);
                                if (!firstVar) json.append(",");
                                firstVar = false;
                                json.append("\"").append(escape(var.name())).append("\": ").append(formatValue(val, reachableObjects, true));
                            }
                            // Add 'this' if available
                            ObjectReference thisObj = frame.thisObject();
                            if (thisObj != null) {
                                if (!firstVar) json.append(",");
                                json.append("\"this\": ").append(formatValue(thisObj, reachableObjects, true));
                            }
                        } catch (AbsentInformationException e) {
                            // Compiled without -g
                        }
                        json.append("}\n");
                        json.append("          }");
                    }
                }
            } catch (IncompatibleThreadStateException e) {
                // Ignore
            }
            json.append("\n        ]\n");
            json.append("      }");
        }
        json.append("\n    },\n");
        
        // Extract Heap based on allKnownObjects
        json.append("    \"heap\": {\n");
        boolean firstObj = true;
        for (Long objId : new HashSet<>(allKnownObjects.keySet())) { // copy to avoid concurrent mod
            if (!firstObj) json.append(",\n");
            firstObj = false;
            
            ObjectReference objRef = allKnownObjects.get(objId);
            boolean isGarbage = !reachableObjects.contains(objId);
            json.append("      \"").append(objId).append("\": {\n");
            json.append("        \"class\": \"").append(escape(objRef.referenceType().name())).append("\",\n");
            json.append("        \"isGarbage\": ").append(isGarbage).append(",\n");
            json.append("        \"fields\": {");
            
            boolean firstField = true;
            try {
                if (objRef instanceof ArrayReference) {
                    ArrayReference arr = (ArrayReference) objRef;
                    List<Value> values = arr.getValues();
                    int limit = Math.min(values.size(), 20); // Limit array output size
                    for (int i = 0; i < limit; i++) {
                        Value v = values.get(i);
                        if (!firstField) json.append(",");
                        firstField = false;
                        json.append("\"[").append(i).append("]\": ").append(formatValue(v, reachableObjects, false));
                    }
                    if (values.size() > 20) {
                        if (!firstField) json.append(",");
                        json.append("\"...\": \"(").append(values.size() - 20).append(" more items)\"");
                    }
                } else {
                    List<Field> fields = classFieldsCache.get(objRef.referenceType());
                    if (fields == null) {
                        fields = new ArrayList<>();
                        for (Field f : objRef.referenceType().allFields()) {
                            if (!f.isStatic()) fields.add(f);
                        }
                        classFieldsCache.put(objRef.referenceType(), fields);
                    }
                    for (Field f : fields) {
                        Value v = objRef.getValue(f);
                        if (!firstField) json.append(",");
                        firstField = false;
                        json.append("\"").append(escape(f.name())).append("\": ").append(formatValue(v, reachableObjects, false));
                    }
                }
            } catch (Exception e) {
                // ignore
            }
            json.append("}\n      }");
        }
        json.append("\n    },\n");
        
        // Extract String Pool
        json.append("    \"stringPool\": {\n");
        boolean firstStr = true;
        for (Map.Entry<Long, String> entry : stringPool.entrySet()) {
            if (!firstStr) json.append(",\n");
            firstStr = false;
            json.append("      \"").append(entry.getKey()).append("\": \"").append(escape(entry.getValue())).append("\"");
        }
        json.append("\n    }\n");
        json.append("  }");
        
        System.out.print(json.toString());
    }
    
    private static String formatValue(Value val, Set<Long> reachable, boolean traceDeep) {
        if (val == null) return "null";
        if (val instanceof StringReference) {
            StringReference strRef = (StringReference) val;
            long id = strRef.uniqueID();
            stringPool.put(id, strRef.value());
            return "{\"__string\": \"" + id + "\"}";
        }
        if (val instanceof ObjectReference) {
            ObjectReference ref = (ObjectReference) val;
            long id = ref.uniqueID();
            reachable.add(id);
            allKnownObjects.put(id, ref);
            // Traverse fields to find more reachable objects
            if (traceDeep) {
                traverseObject(ref, reachable, 0);
            }
            return "{\"__ref\": \"" + id + "\"}";
        }
        if (val instanceof CharValue) {
            return "\"" + escape(String.valueOf(((CharValue) val).value())) + "\"";
        }
        if (val instanceof PrimitiveValue) {
            return val.toString();
        }
        return "\"" + escape(val.toString()) + "\"";
    }
    
    private static void traverseObject(ObjectReference obj, Set<Long> reachable, int depth) {
        if (depth > 5) return;
        try {
            String className = obj.referenceType().name();
            if (className.equals("java.lang.Thread") || className.equals("java.lang.ThreadGroup") || className.equals("java.lang.Class")) {
                return;
            }
            if (obj instanceof ArrayReference) {
                ArrayReference arr = (ArrayReference) obj;
                for (Value v : arr.getValues()) {
                    if (v instanceof ObjectReference) {
                        long id = ((ObjectReference) v).uniqueID();
                        if (!reachable.contains(id)) {
                            reachable.add(id);
                            allKnownObjects.put(id, (ObjectReference) v);
                            traverseObject((ObjectReference) v, reachable, depth + 1);
                        }
                    }
                }
            } else {
                List<Field> fields = classFieldsCache.get(obj.referenceType());
                if (fields == null) {
                    fields = new ArrayList<>();
                    for (Field f : obj.referenceType().allFields()) {
                        if (!f.isStatic()) fields.add(f);
                    }
                    classFieldsCache.put(obj.referenceType(), fields);
                }
                for (Field f : fields) {
                    Value v = obj.getValue(f);
                    if (v instanceof ObjectReference) {
                        long id = ((ObjectReference) v).uniqueID();
                        if (!reachable.contains(id)) {
                            reachable.add(id);
                            allKnownObjects.put(id, (ObjectReference) v);
                            traverseObject((ObjectReference) v, reachable, depth + 1);
                        }
                    }
                }
            }
        } catch (Exception e) {
        }
    }
    
    private static String escape(String s) {
        if (s == null) return "";
        StringBuilder sb = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '\\': sb.append("\\\\"); break;
                case '\"': sb.append("\\\""); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20 || c > 0x7E) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }
}
