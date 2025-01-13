export interface ProductResponse {
  id: string;
  slug: string;
  title: string;
  description: string;
  inStock: number;
  price: number;
  sold: boolean;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
}
