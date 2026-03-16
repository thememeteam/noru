export const COLLEGE_DESTINATION = "College";

export const VEHICLE_OPTIONS = ["auto", "cab", "ownBike", "ownCar"] as const;
export type VehicleType = (typeof VEHICLE_OPTIONS)[number];

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  auto: "Auto",
  cab: "Cab",
  ownBike: "Own Bike",
  ownCar: "Own Car",
};
