"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Schema = mongoose_1.default.Schema;
const UserSchema = new Schema({
    name: {
        first_name: { type: String },
        last_name: { type: String }
    },
    current_routine: { type: Schema.Types.ObjectId, ref: 'Routine' }
});
exports.default = mongoose_1.default.model('User', UserSchema);
