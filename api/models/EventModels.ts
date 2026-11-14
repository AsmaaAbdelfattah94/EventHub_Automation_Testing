
export interface EventData {
  id: number;
  title: string;
  description: string;
  category: string;
  venue: string;
  city: string;
  eventDate: string;
  price: string;
  totalSeats: number;
  availableSeats: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventResponse {
  success: boolean;
  data: EventData;
}

export interface EventsResponse {
  success: boolean;
  data: EventData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
