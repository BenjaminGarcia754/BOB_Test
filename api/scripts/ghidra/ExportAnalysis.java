// Ghidra headless post-analysis script
// File: api/scripts/ghidra/ExportAnalysis.java
//
// Run with: analyzeHeadless <projectDir> <projectName> -import <binary>
//           -postScript ExportAnalysis.java -scriptPath <scriptsDir>
//           -deleteProject
//
// Environment variables:
//   GHIDRA_OUTPUT  — path to write the output JSON (required)
//   MAX_FUNCTIONS  — maximum number of functions to export (default: 20)

import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import ghidra.program.model.data.*;
import ghidra.program.model.address.Address;
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.util.task.ConsoleTaskMonitor;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

public class ExportAnalysis extends GhidraScript {

    @Override
    public void run() throws Exception {
        String outputPath = System.getProperty("GHIDRA_OUTPUT");
        if (outputPath == null || outputPath.isEmpty()) {
            // Fallback: write to workDir/raw/ghidra.json relative to script dir
            outputPath = new File(getSourceFile().getParentFile().getParentFile(),
                "raw/ghidra.json").getAbsolutePath();
        }

        int maxFunctions;
        try {
            String maxFuncProp = System.getProperty("MAX_FUNCTIONS", "20");
            maxFunctions = Integer.parseInt(maxFuncProp);
        } catch (NumberFormatException e) {
            maxFunctions = 20;
        }

        Program program = currentProgram;
        if (program == null) {
            printerr("ExportAnalysis: no current program");
            return;
        }

        // --- Format and architecture ---
        String format = "PE";
        String architecture = program.getLanguage().getLanguageDescription().toString();
        String compiler = program.getCompilerSpec().getCompilerSpecDescription().toString();
        String imageBase = "0x" + Long.toHexString(program.getImageBase().getOffset());

        // --- Imports ---
        List<Map<String, String>> imports = new ArrayList<>();
        ExternalManager extMgr = program.getExternalManager();
        for (String libName : extMgr.getExternalLibraryNames()) {
            ExternalLocationIterator iter = extMgr.getExternalLocations(libName);
            while (iter.hasNext()) {
                ExternalLocation loc = iter.next();
                Address thunkAddr = null;
                // Find the thunk address in the import table
                Function fn = loc.getFunction();
                if (fn != null) {
                    thunkAddr = fn.getEntryPoint();
                } else {
                    // Try to find via symbol
                    SymbolTable symTable = program.getSymbolTable();
                    SymbolIterator syms = symTable.getSymbols(loc.getLabel(), false);
                    if (syms.hasNext()) {
                        thunkAddr = syms.next().getAddress();
                    }
                }
                String addr = thunkAddr != null ? "0x" + Long.toHexString(thunkAddr.getOffset()) : "0x0";
                Map<String, String> imp = new LinkedHashMap<>();
                imp.put("library", libName);
                imp.put("name", loc.getLabel());
                imp.put("address", addr);
                imports.add(imp);
            }
        }

        // --- Strings ---
        List<Map<String, Object>> strings = new ArrayList<>();
        DataIterator dataIter = program.getListing().getDefinedData(true);
        while (dataIter.hasNext()) {
            Data data = dataIter.next();
            DataType dt = data.getDataType();
            if (dt instanceof AbstractStringDataType) {
                Object val = data.getValue();
                if (val == null) continue;
                String strVal = val.toString();
                int len = strVal.length();
                if (len < 6) continue;
                // Exclude pure numeric or pure whitespace
                if (strVal.trim().isEmpty()) continue;
                if (strVal.matches("[0-9]+")) continue;

                String addr = "0x" + Long.toHexString(data.getAddress().getOffset());
                Map<String, Object> strEntry = new LinkedHashMap<>();
                strEntry.put("value", strVal);
                strEntry.put("address", addr);
                strEntry.put("length", len);
                strings.add(strEntry);
            }
        }

        // --- Functions (top N by size, with pseudocode) ---
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(program);
        ConsoleTaskMonitor monitor = new ConsoleTaskMonitor();

        FunctionManager funcMgr = program.getFunctionManager();
        List<Function> allFunctions = new ArrayList<>();
        FunctionIterator funcIter = funcMgr.getFunctions(true);
        while (funcIter.hasNext()) {
            Function fn = funcIter.next();
            if (!fn.isExternal() && !fn.isThunk()) {
                allFunctions.add(fn);
            }
        }

        // Sort by body size descending
        allFunctions.sort((a, b) -> Long.compare(b.getBody().getNumAddresses(), a.getBody().getNumAddresses()));

        List<Map<String, Object>> functions = new ArrayList<>();
        int exported = 0;
        for (Function fn : allFunctions) {
            if (exported >= maxFunctions) break;

            String pseudocode = "";
            try {
                DecompileResults results = decompiler.decompileFunction(fn, 60, monitor);
                if (results != null && results.decompileCompleted()) {
                    pseudocode = results.getDecompiledFunction().getC();
                    if (pseudocode.length() > 4000) {
                        pseudocode = pseudocode.substring(0, 4000);
                    }
                }
            } catch (Exception e) {
                pseudocode = "/* decompilation failed: " + e.getMessage() + " */";
            }

            // Called functions
            List<String> calledFunctions = new ArrayList<>();
            for (Function called : fn.getCalledFunctions(monitor)) {
                calledFunctions.add(called.getName());
            }

            Map<String, Object> fnEntry = new LinkedHashMap<>();
            fnEntry.put("name", fn.getName());
            fnEntry.put("address", "0x" + Long.toHexString(fn.getEntryPoint().getOffset()));
            fnEntry.put("size", (int) fn.getBody().getNumAddresses());
            fnEntry.put("calledFunctions", calledFunctions);
            fnEntry.put("pseudocode", pseudocode);
            functions.add(fnEntry);
            exported++;
        }

        decompiler.dispose();

        // --- Assemble JSON ---
        Map<String, Object> output = new LinkedHashMap<>();
        output.put("format", format);
        output.put("architecture", architecture);
        output.put("compiler", compiler);
        output.put("imageBase", imageBase);
        output.put("imports", imports);
        output.put("strings", strings);
        output.put("functions", functions);

        String json = toJson(output);

        // Ensure output directory exists
        File outputFile = new File(outputPath);
        outputFile.getParentFile().mkdirs();

        try (FileWriter writer = new FileWriter(outputFile)) {
            writer.write(json);
        }

        println("ExportAnalysis: wrote " + outputPath);
        println("ExportAnalysis: imports=" + imports.size() + " strings=" + strings.size() + " functions=" + functions.size());
    }

    // Minimal JSON serialiser (no external dependencies)
    @SuppressWarnings("unchecked")
    private String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String) {
            return "\"" + ((String) obj)
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                + "\"";
        }
        if (obj instanceof Number || obj instanceof Boolean) {
            return obj.toString();
        }
        if (obj instanceof List) {
            List<?> list = (List<?>) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < list.size(); i++) {
                if (i > 0) sb.append(",");
                sb.append(toJson(list.get(i)));
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof Map) {
            Map<String, Object> map = (Map<String, Object>) obj;
            StringBuilder sb = new StringBuilder("{");
            boolean first = true;
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                if (!first) sb.append(",");
                first = false;
                sb.append(toJson(entry.getKey())).append(":").append(toJson(entry.getValue()));
            }
            sb.append("}");
            return sb.toString();
        }
        return "\"" + obj.toString().replace("\"", "\\\"") + "\"";
    }
}
