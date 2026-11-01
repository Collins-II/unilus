import { BookingPolicyError } from "@/lib/bookings";
import { getPortalConfig, portalRequest } from "@/lib/portal";

export type CentralBooking = {
  _id: string;
  room: { name?: string; code?: string } | null;
  purpose: string;
  title?: string;
  attendees: number;
  tutorialGroup?: { groupName: string; courseCode: string; topic: string; leaderName: string };
  conversation?: string | null;
  startTime: string;
  endTime: string;
  status: string;
  cancellationReason?: string;
};

export function requestAdminBookings(studentId: string | undefined, method: "GET"): Promise<{ bookings: CentralBooking[] }>;
export function requestAdminBookings(
  studentId: string | undefined, method: "POST" | "PATCH", body?: Record<string, unknown>, id?: string
): Promise<{ booking: CentralBooking }>;
export async function requestAdminBookings(
  studentId: string | undefined,
  method: "GET" | "POST" | "PATCH",
  body?: Record<string, unknown>,
  id?: string
): Promise<{ bookings: CentralBooking[] } | { booking: CentralBooking }> {
  if (!getPortalConfig()) throw new BookingPolicyError("Central admin booking integration is not configured.", 503);
  if (!studentId) throw new BookingPolicyError("Please sign in again with your student ID.", 401);
  let response: Response;
  try {
    response = await portalRequest(`bookings${id ? `/${encodeURIComponent(id)}` : ""}`, {
      method,
      query: method === "GET" ? { studentId } : undefined,
      body: method !== "GET" ? { ...body, studentId } : undefined,
    });
  } catch {
    throw new BookingPolicyError("Central booking approval is temporarily unavailable. Please retry.", 502);
  }
  let result;
  try {
    result = await response.json();
  } catch {
    throw new BookingPolicyError("Central admin returned an invalid booking response.", 502);
  }
  if (!response.ok) {
    if (method === "GET" && response.status === 404) {
      if (result?.code === "STUDENT_NOT_FOUND") {
        throw new BookingPolicyError("Your student account is not active in central administration. Contact Student Services to have it registered or activated.", 404);
      }
      console.error("Central bookings endpoint returned an unexpected 404.");
      throw new BookingPolicyError("Central booking approval is temporarily unavailable. Please retry.", 502);
    }
    throw new BookingPolicyError(typeof result?.error === "string" ? result.error : "Central admin could not process this request.", response.status);
  }
  if (method === "GET" ? !Array.isArray(result?.bookings) : !result?.booking?._id) {
    throw new BookingPolicyError("Central admin returned an invalid booking response.", 502);
  }
  return result;
}
