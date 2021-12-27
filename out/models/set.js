"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetSchema = void 0;
const mongoose_1 = require("mongoose");
exports.SetSchema = new mongoose_1.Schema({
    weight: { type: Number, required: true },
    exercise: { type: String, required: true },
    repetitions: { type: Number, required: true },
    rpe: { type: Number, required: true },
    notes: { type: String }
}, {
    timestamps: true,
});
const Set = (0, mongoose_1.model)('Set', exports.SetSchema);
exports.default = Set;
