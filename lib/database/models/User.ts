import mongoose, { Schema, type Document } from "mongoose";
import { campusIds, type CampusId } from "@/lib/campus-geography";

export interface IUser extends Document<mongoose.Types.ObjectId> {
  studentId: string;
  name: string;
  email: string;
  password?: string;
  role: "student" | "staff" | "admin";
  department?: string;
  program?: string;
  campus?: CampusId;
  year?: string;
  phone?: string;
  status?: "active" | "pending" | "inactive";
  failedLogins?: number;
  lockedUntil?: Date;
  paymentMethod?: "card" | "mobile-money" | "bank-transfer";
  paymentProvider?: string;
  billingEmail?: string;
  cardholderName?: string;
  last4?: string;
  paymentStatus?: "verified" | "pending" | "inactive";
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
    weeklyDigest: boolean;
  };
  appSettings?: {
    compactMode: boolean;
    campusAlerts: boolean;
    autoConfirmBookings: boolean;
    darkMode: boolean;
  };
}

const userSchema = new Schema<IUser>(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["student", "staff", "admin"],
      default: "student",
    },
    department: { type: String, trim: true },
    program: { type: String, trim: true },
    campus: { type: String, enum: campusIds },
    year: { type: String, trim: true },
    phone: { type: String, trim: true },
    status: {
      type: String,
      enum: ["active", "pending", "inactive"],
      default: "active",
    },
    failedLogins: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, select: false },
    paymentMethod: {
      type: String,
      enum: ["card", "mobile-money", "bank-transfer"],
      default: "card",
    },
    paymentProvider: { type: String, trim: true, default: "Visa" },
    billingEmail: { type: String, trim: true },
    cardholderName: { type: String, trim: true },
    last4: { type: String, trim: true },
    paymentStatus: {
      type: String,
      enum: ["verified", "pending", "inactive"],
      default: "verified",
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      weeklyDigest: { type: Boolean, default: true },
    },
    appSettings: {
      compactMode: { type: Boolean, default: false },
      campusAlerts: { type: Boolean, default: true },
      autoConfirmBookings: { type: Boolean, default: false },
      darkMode: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

const User = (mongoose.models.User as mongoose.Model<IUser> | undefined) || mongoose.model<IUser>("User", userSchema);
export default User;
