import { site } from "@/data/site";

export function WhatsappFab() {
  return (
    <a
      href={`https://wa.me/${site.whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Escribinos por WhatsApp al ${site.whatsappDisplay}`}
      title={`WhatsApp ${site.whatsappDisplay}`}
      className="fixed bottom-5 right-5 z-[95] grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-[0_10px_30px_rgba(17,24,15,0.28)] transition hover:scale-105 hover:bg-[#1ebe5a] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 sm:h-16 sm:w-16"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-7 w-7 sm:h-8 sm:w-8">
        <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35z" />
        <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.83 9.83 0 0 0 4.69 1.2h.01c5.43 0 9.85-4.42 9.85-9.86A9.79 9.79 0 0 0 12.04 2zm0 17.96h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.17.83.85-3.09-.2-.32a8.14 8.14 0 0 1-1.25-4.35c0-4.52 3.68-8.19 8.2-8.19a8.14 8.14 0 0 1 5.79 2.4 8.1 8.1 0 0 1 2.4 5.8c0 4.52-3.68 8.24-8.14 8.24z" />
      </svg>
    </a>
  );
}
