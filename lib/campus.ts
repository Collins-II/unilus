export type CampusPlace = {
  id: string;
  name: string;
  code: string;
  building: string;
  category: string;
  capacity: number;
  isAvailable: boolean;
  lat: number | null;
  lng: number | null;
};

type LocationRecord = {
  _id?: string;
  id?: string;
  name?: string;
  code?: string;
  building?: string;
  category?: string;
  capacity?: number;
  isAvailable?: boolean;
  latitude?: number;
  longitude?: number;
  location?: { coordinates?: number[] };
};

export function campusPlaces(records: LocationRecord[]): CampusPlace[] {
  return records.map((record) => {
    const lat = record.latitude ?? record.location?.coordinates?.[1];
    const lng = record.longitude ?? record.location?.coordinates?.[0];
    const hasCoordinates = typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
      typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180;
    return {
      id: record._id || record.id || "",
      name: record.name || "Unnamed campus space",
      code: record.code || "",
      building: record.building || "Building not listed",
      category: record.category || "Campus",
      capacity: record.capacity ?? 0,
      isAvailable: record.isAvailable !== false,
      lat: hasCoordinates ? lat : null,
      lng: hasCoordinates ? lng : null,
    };
  }).filter((record) => Boolean(record.id));
}

export function filterCampusPlaces(places: CampusPlace[], query: string, category: string) {
  const term = query.trim().toLowerCase();
  return places.filter((place) =>
    (category === "all" || place.category === category) &&
    (!term || [place.name, place.code, place.building, place.category].some((value) => value.toLowerCase().includes(term)))
  );
}
