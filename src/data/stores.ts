export type Store = {
  id: string;
  name: string;
  city: string;
  province: string;
  address: string;
  coords: {
    lat: number;
    lng: number;
  };
  placeId: string;
};

export const stores: Store[] = [
  {
    id: "apostoles",
    name: "Mate Tierra",
    city: "Ap\u00f3stoles",
    province: "Misiones",
    address: "Barrio 56 Viv Casa 31",
    coords: {
      lat: -27.9192546,
      lng: -55.74738
    },
    placeId: "ChIJZZqJv3o9VpQRIKR3ZPTjwsg"
  }
];

/** URL del embed y enlace externo del local principal. */
export const mainStoreMapEmbed =
  "https://maps.google.com/maps?q=-27.9192546,-55.74738&t=&z=17&ie=UTF8&iwloc=&output=embed";

export const mainStoreMapLink =
  "https://www.google.com/maps/search/?api=1&query=-27.9192546,-55.74738&query_place_id=ChIJZZqJv3o9VpQRIKR3ZPTjwsg";