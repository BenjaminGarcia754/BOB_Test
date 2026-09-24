"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const analyses_js_1 = require("./routes/analyses.js");
const worker_js_1 = require("./jobs/worker.js");
const config_js_1 = require("./config.js");
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use("/api/analyses", analyses_js_1.analysesRouter);
    // Global error handler
    app.use((err, _req, res, _next) => {
        if (err.type === "entity.too.large") {
            res.status(413).json({
                error: { code: "FILE_TOO_LARGE", message: "Request body too large" },
            });
            return;
        }
        const message = err instanceof Error ? err.message : "Internal server error";
        res.status(500).json({
            error: { code: "INTERNAL_ERROR", message },
        });
    });
    return app;
}
if (require.main === module) {
    const app = createApp();
    (0, worker_js_1.startWorker)();
    (0, worker_js_1.startCleanupLoop)();
    app.listen(config_js_1.config.port, () => {
        console.log(`Code Archaeologist API listening on port ${config_js_1.config.port}`);
    });
}
//# sourceMappingURL=index.js.map