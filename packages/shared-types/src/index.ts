export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export interface Dish { id: string; name: string; slug: string; description: string; price: number; imageUrl: string; category: string; featured: boolean; }
export interface ReservationRequest { date: string; time: string; guests: number; name: string; email: string; phone: string; message?: string; consent: boolean; }
