"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ExerciseSchema = new mongoose_1.Schema({
    name: { type: String },
    category: { type: String },
    is_compound: { type: Boolean, default: false }
});
exports.default = (0, mongoose_1.model)('Exercise', ExerciseSchema);
