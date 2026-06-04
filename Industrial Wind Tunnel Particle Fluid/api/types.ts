
export interface Airfoil {
  id: number;
  name: string;
  description: string;
  reynoldsNumber: number;
  coordinates: { x: number; y: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAirfoilRequest {
  name: string;
  description?: string;
  reynoldsNumber: number;
  coordinates: { x: number; y: number }[];
}

export interface UpdateAirfoilRequest {
  name?: string;
  description?: string;
  reynoldsNumber?: number;
  coordinates?: { x: number; y: number }[];
}

export interface ApiResponse&lt;T&gt; {
  success: boolean;
  data?: T;
  error?: string;
}

