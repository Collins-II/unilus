import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { campusIds } from "@/lib/campus-geography";

const schema = new Schema({
  code: { type: String, required: true, unique: true }, name: { type: String, required: true },
  department: { type: Schema.Types.ObjectId, required: true },
  campus: { type: String, enum: campusIds, required: true },
}, { timestamps: true });
export default (mongoose.models.StudentProgramme as mongoose.Model<InferSchemaType<typeof schema>> | undefined) ||
  mongoose.model("StudentProgramme", schema, "programmes");
