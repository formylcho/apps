export default function manifest() {
  return {
    name: "Zettelkasten — 考えを継ぎ足して育てるノート",
    short_name: "Zettelkasten",
    description: "ツリー状にメモを育てる、自分専用の非公開ノート",
    start_url: "/",
    // PCはブラウザ準拠（タブ動作）。iPhoneの全画面は apple-mobile-web-app-capable メタ側で維持。
    display: "browser",
    background_color: "#fbfaf7",
    theme_color: "#3b6ea5",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
