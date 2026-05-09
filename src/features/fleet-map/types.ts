export interface Ship {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  fuel: number;
  status: string;
  weather_adverse?: boolean;
}
