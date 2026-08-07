export type Store = {
  id: string;
  name: string;
  city: string;
  province: string;
  address: string;
};

export const stores: Store[] = [
  {
    id: "apostoles",
    name: "Mate Tierra",
    city: "Ap\u00f3stoles",
    province: "Misiones",
    address: "Calle Funes, Ap\u00f3stoles"
  }
];

/** URL del embed y enlace externo del local principal. */
export const mainStoreMapEmbed =
  "https://maps.google.com/maps?q=-27.9191968,-55.7473199&t=&z=17&ie=UTF8&iwloc=&output=embed";

export const mainStoreMapLink =
  "https://www.google.com/maps?q=-27.9191968,-55.7473199&z=17";