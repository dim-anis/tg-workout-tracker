import { isNamedImports } from "typescript";
import Exercise from "../models/exercise";

export async function findExercise(name?: string, category?: string) {
  try {
    if (category) {
      const data = await Exercise.find({ category: category }, "name").exec();
      return data;
    } else if ( name ) {
      const data = await Exercise.find({ name });
      return data;
    } else {
      const data = await Exercise.find({ });
      return data;
    }
  } catch (e) {
      console.log(e);
  }
}
