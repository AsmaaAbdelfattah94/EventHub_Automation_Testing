
// Booking reference format observed in the UI and API: one letter, a dash
// and six letters/digits, e.g. H-MM11UN. The API docs say EVT-XXXXXX; this
// mismatch is listed in the README.
export const BOOKING_REF_PATTERN = /^[A-Z]-[A-Z0-9]{6}$/;
