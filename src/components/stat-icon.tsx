export function StatIcon({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} title={alt} className="mx-auto h-5 w-5 object-contain" />;
}
