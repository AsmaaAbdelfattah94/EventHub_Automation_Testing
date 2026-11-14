
export interface CreateBookingRequest {
  eventId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
}

export interface BookingData {
  id: number;
  eventId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  totalPrice: number;
  status: string;
  bookingRef: string;
  createdAt: string;
  updatedAt: string;
  event: {
    id: number;
    title: string;
    price: number;
    availableSeats: number;
  };
}

export interface CreateBookingResponse {
  success: boolean;
  data: BookingData;
  message: string;
}
