"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async = __importStar(require("async"));
const mongoose_1 = __importDefault(require("mongoose"));
const exercise_1 = __importDefault(require("./models/exercise"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const uri = "mongodb+srv://<username>:<password>@cluster1.vp9hy.mongodb.net/<database>";
const options = {
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD
};
mongoose_1.default.connect(uri, options);
const db = mongoose_1.default.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', function () {
    console.log('Connected to MongoDB successfully');
});
let exercises = [];
function exerciseCreate(name, category, is_compound) {
    const exerciseDetails = {
        name: name,
        category: category,
        is_compound: is_compound
    };
    let exercise = new exercise_1.default(exerciseDetails);
    exercise.save(function (error) {
        if (error) {
            return;
        }
        console.log(`New exercise: ${exercise}`);
        exercises.push(exercise);
    });
}
function createExercises() {
    async.parallel([
        function () {
            exerciseCreate('Barbell Squat', 'Legs', true);
        },
        function () {
            exerciseCreate('Seated Leg Curl', 'Legs', false);
        },
        function () {
            exerciseCreate('Bulgarian Split Squat', 'Legs', true);
        },
        function () {
            exerciseCreate('EZ-bar Curl', 'Biceps', false);
        },
        function () {
            exerciseCreate('Flat Barbell Bench Press', 'Chest', true);
        },
        function () {
            exerciseCreate('Dumbbell Row', 'Back', true);
        },
        function () {
            exerciseCreate('Incline Barbell Bench Press', 'Chest', true);
        },
        function () {
            exerciseCreate('Lat Pulldown', 'Back', true);
        },
        function () {
            exerciseCreate('Lateral Machine Raise', 'Shoulders', false);
        },
        function () {
            exerciseCreate('Romanian Deadlift', 'Legs', true);
        },
        function () {
            exerciseCreate('Hack Squat', 'Legs', true);
        },
        function () {
            exerciseCreate('Leg Extension Machine', 'Legs', false);
        },
        function () {
            exerciseCreate('Cable Curl', 'Biceps', false);
        },
        function () {
            exerciseCreate('Overhead Press', 'Shoulders', true);
        },
        function () {
            exerciseCreate('Seated Cable Row', 'Back', true);
        },
        function () {
            exerciseCreate('Dumbbell Overhead Triceps Extension', 'Triceps', false);
        },
        function () {
            exerciseCreate('Seated Machine Fly', 'Chest', false);
        }
    ]);
}
createExercises();
