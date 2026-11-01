import mongoose, { Schema, type Document } from "mongoose";

export interface IMessage extends Document<mongoose.Types.ObjectId> {
  conversation: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  deletedAt?: Date;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageSchema.index({ conversation: 1, createdAt: -1 });

const Message = (mongoose.models.Message as mongoose.Model<IMessage> | undefined) || mongoose.model<IMessage>("Message", messageSchema);
export default Message;
