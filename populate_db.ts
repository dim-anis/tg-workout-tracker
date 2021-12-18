import * as async from 'async';
import mongoose from 'mongoose' ;
import Exercise from './models/exercise';
import * as dotenv from 'dotenv' ;

dotenv.config();

const uri = "mongodb+srv://<username>:<password>@cluster1.vp9hy.mongodb.net/<database>";
const options = {
    dbName: process.env.DB_NAME,
    user: process.env.DB_USER,
    pass: process.env.DB_PASSWORD
};

mongoose.connect(uri, options);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error: '));
db.once('open', function() {
    console.log('Connected to MongoDB successfully');
});

let exercises: Array<{name: string, category: string, is_compound: boolean}> = [];

function exerciseCreate(name: string, category: string, is_compound: boolean) {
    const exerciseDetails = {
        name: name,
        category: category,
        is_compound: is_compound
    }

    let exercise = new Exercise(exerciseDetails);
    exercise.save(function(error) {
        if (error) {
            return
        }
        console.log(`New exercise: ${exercise}`);
        exercises.push(exercise);
    });
}

function createExercises() {
    async.parallel([
        function() {
            exerciseCreate('Barbell Squat', 'Legs', true)
        },
        function() {
            exerciseCreate('Seated Leg Curl', 'Legs', false)
        },
        function() {
            exerciseCreate('Bulgarian Split Squat', 'Legs', true)
        },
        function() {
            exerciseCreate('EZ-bar Curl', 'Biceps', false)
        },
        function() {
            exerciseCreate('Flat Barbell Bench Press', 'Chest', true)
        },
        function() {
            exerciseCreate('Dumbbell Row', 'Back', true)
        },
        function() {
            exerciseCreate('Incline Barbell Bench Press', 'Chest', true)
        },
        function() {
            exerciseCreate('Lat Pulldown', 'Back', true)
        },
        function() {
            exerciseCreate('Lateral Machine Raise', 'Shoulders', false)
        },
        function() {
            exerciseCreate('Romanian Deadlift', 'Legs', true)
        },
        function() {
            exerciseCreate('Hack Squat', 'Legs', true)
        },
        function() {
            exerciseCreate('Leg Extension Machine', 'Legs', false)
        },
        function() {
            exerciseCreate('Cable Curl', 'Biceps', false)
        },
        function() {
            exerciseCreate('Overhead Press', 'Shoulders', true)
        },
        function() {
            exerciseCreate('Seated Cable Row', 'Back', true)
        },
        function() {
            exerciseCreate('Dumbbell Overhead Triceps Extension', 'Triceps', false)
        },
        function() {
            exerciseCreate('Seated Machine Fly', 'Chest', false)
        }
    ]);
}

createExercises();