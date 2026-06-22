export type Product = {
  id: string;
  name: string;
  price: string;
  discount?: string;
  image: string;
  description: string;
};

export const products: Product[] = [
  {
    id: "yerba-500",
    name: "Yerba Mate 500g",
    price: "$4.900",
    discount: "10% OFF",
    image: "https://images.unsplash.com/photo-1615485737457-f07082c77813?auto=format&fit=crop&w=900&q=80",
    description: "Blend suave, bajo polvo y estacionamiento natural."
  },
  {
    id: "yerba-x10",
    name: "Yerba Mate x10",
    price: "$42.900",
    discount: "Pack ahorro",
    image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=80",
    description: "Caja familiar para tener tu ritual siempre listo."
  },
  {
    id: "mate-cocido",
    name: "Mate Cocido",
    price: "$3.200",
    image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=80",
    description: "Saquitos livianos con aroma tostado y final amable."
  },
  {
    id: "lata-yerbera",
    name: "Lata Yerbera",
    price: "$12.500",
    discount: "Nuevo",
    image: "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?auto=format&fit=crop&w=900&q=80",
    description: "Lata hermetica para conservar frescura y estilo."
  },
  {
    id: "mate-bombilla",
    name: "Mate + Bombilla",
    price: "$18.900",
    image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=80",
    description: "Kit esencial para empezar con una cebada pareja."
  },
  {
    id: "taza",
    name: "Taza",
    price: "$7.400",
    image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80",
    description: "Ceramica robusta para mate cocido y sobremesa."
  },
  {
    id: "remera",
    name: "Remera",
    price: "$16.000",
    discount: "Edicion limitada",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80",
    description: "Algodon premium con grafica sobria de la marca."
  }
];

export const featuredProducts = products.slice(0, 4);