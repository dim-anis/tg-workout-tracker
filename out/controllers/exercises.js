"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showExercises = void 0;
const exercise_1 = __importDefault(require("../models/exercise"));
function showExercises(category) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (category) {
                const data = yield exercise_1.default.find({ category: category }, 'name').exec();
                return data;
            }
            else {
                const data = yield exercise_1.default.find({});
                return data;
            }
        }
        catch (e) {
            console.log(e);
        }
    });
}
exports.showExercises = showExercises;
