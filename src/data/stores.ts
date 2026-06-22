export type Store = {
  id: string;
  name: string;
  city: string;
  province: string;
  address: string;
};

export const stores: Store[] = [
  {
    id: "palermo",
    name: "Almacen Natural Palermo",
    city: "CABA",
    province: "Buenos Aires",
    address: "Gurruchaga 1412"
  },
  {
    id: "rosario",
    name: "Mercado Verde Rosario",
    city: "Rosario",
    province: "Santa Fe",
    address: "Pichincha 642"
  },
  {
    id: "cordoba",
    name: "Despensa Serrana",
    city: "Cordoba",
    province: "Cordoba",
    address: "Belgrano 902"
  },
  {
    id: "posadas",
    name: "Origen Misiones",
    city: "Posadas",
    province: "Misiones",
    address: "Junin 1880"
  }
];