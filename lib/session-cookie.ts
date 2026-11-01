export const STUDENT_SESSION_COOKIE =
  process.env.NODE_ENV === "production" ? "__Secure-unilus-student.session-token" : "unilus-student.session-token";

/** 12 hours, matching the staff portal session lifetime. */
export const STUDENT_SESSION_MAX_AGE = 60 * 60 * 12;
