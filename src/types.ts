export type Category = 'Shawls & Scarves' | 'Full Sets' | 'Gifts';

export interface Product {
  id: string;
  title: string;
  category: Category;
  price: number;
  description: string;
  images: string[]; // Base64 data URLs or inline SVG strings
  createdAt: string;
  status?: 'instock' | 'outofstock';
  discountPercentage?: number;
}

export interface CartItem {
  id: string; // matches product.id
  product: Product;
  quantity: number;
}
