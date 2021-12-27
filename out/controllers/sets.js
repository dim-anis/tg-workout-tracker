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
exports.getLastWorkout = exports.addSet = void 0;
const set_1 = __importDefault(require("../models/set"));
const endOfDay_1 = __importDefault(require("date-fns/endOfDay"));
const startOfDay_1 = __importDefault(require("date-fns/startOfDay"));
function addSet(exercise, weight, repetitions, rpe) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const set_data = new set_1.default({
                exercise: exercise,
                weight: weight,
                repetitions: repetitions,
                rpe: rpe
            });
            let data = yield set_data.save();
            console.log(data);
            return 'Data has been successfully recorded.';
        }
        catch (err) {
            return err.message;
        }
    });
}
exports.addSet = addSet;
function getLastWorkout() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const lastDateISO = yield set_1.default.find({});
            const lastDate = (_a = lastDateISO === null || lastDateISO === void 0 ? void 0 : lastDateISO.at(-1)) === null || _a === void 0 ? void 0 : _a.createdAt.toISOString().split('T')[0];
            console.log(lastDate);
            if (lastDate !== undefined) {
                const lastWorkout = yield set_1.default.find({
                    createdAt: {
                        $gte: (0, startOfDay_1.default)(new Date(lastDate)),
                        $lte: (0, endOfDay_1.default)(new Date(lastDate))
                    }
                });
                return lastWorkout;
            }
        }
        catch (err) {
            console.log(err);
        }
    });
}
exports.getLastWorkout = getLastWorkout;
