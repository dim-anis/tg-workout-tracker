"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
const RoutineSchema = new Schema({
    name: { type: String },
    exercise_split: {
        upper_A: [Schema.Types.ObjectId],
        lower_A: [Schema.Types.ObjectId],
        upper_B: [Schema.Types.ObjectId],
        lower_B: [Schema.Types.ObjectId]
    },
});
exports.default = mongoose_1.default.model('Routine', RoutineSchema);
