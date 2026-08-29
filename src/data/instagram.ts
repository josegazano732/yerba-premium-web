import { site } from "@/data/site";

/** Publicación o reel de Instagram destacado en la home. */
export type InstagramPost = {
  id: string;
  title: string;
  thumbnail_url: string;
  post_url: string;
  order: number;
};

/**
 * Destacados de Instagram para la sección de social proof.
 *
 * `post_url` apunta al enlace directo del reel/post (adónde navega el click).
 * `thumbnail_url` es la portada que renderiza next/image. Guardá las fotos en
 * `public/images/instagram/` y referenciarlas como `/images/instagram/<archivo>`.
 */
export const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: "ig-1",
    title: "Mates artesanales con identidad Argenta",
    thumbnail_url: "/images/instagram/Mate_1.jpg",
    post_url: "https://www.instagram.com/reel/DZ5su4npZmm/",
    order: 1
  },
  {
    id: "ig-2",
    title: "Termo personalizado de Mate Tierra",
    thumbnail_url: "/images/instagram/Mate_argentina2.jpg",
    post_url: "https://www.instagram.com/reel/DZQSVsvxduS/",
    order: 2
  },
  {
    id: "ig-3",
    title: "Bombillas personalizadas de Mate Tierra",
    thumbnail_url:
      "/images/instagram/Bombillas.jpg",
    post_url: "https://www.instagram.com/p/DOvxi2GDSe6/",
    order: 3
  },
  {
    id: "ig-4",
    title: "Set matero con identidad natural",
    thumbnail_url:
      "/images/instagram/Morral.jpg",
    post_url: "https://www.instagram.com/p/DO9KT8Bkf1A/?img_index=3",
    order: 4
  }
];

/** Posts ordenados por `order` ascendente, listos para renderizar. */
export const sortedInstagramPosts = [...INSTAGRAM_POSTS].sort((a, b) => a.order - b.order);
