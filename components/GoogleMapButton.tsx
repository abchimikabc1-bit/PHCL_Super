import { MapPin } from 'lucide-react';

type GoogleMapButtonProps = {
  destination?: string;
  label?: string;
};

export default function GoogleMapButton({
  destination = 'PHCL Super H/Q, Dar es Salaam, Tanzania',
  label = 'Fungua Google Maps',
}: GoogleMapButtonProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination,
  )}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 font-semibold text-yellow-300 shadow-lg transition hover:scale-105 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-yellow-400"
      aria-label={`Pata maelekezo kwenda ${destination} kupitia Google Maps`}
    >
      <MapPin className="h-5 w-5" />
      {label}
    </a>
  );
}