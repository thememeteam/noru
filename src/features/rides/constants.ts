export const COLLEGE_DESTINATION = "Amrita Vishwa Vidyapeetham";

export const VEHICLE_OPTIONS = ["auto", "cab", "ownBike", "ownCar"] as const;
export type VehicleType = (typeof VEHICLE_OPTIONS)[number];

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  auto: "Auto",
  cab: "Cab",
  ownBike: "Own Bike",
  ownCar: "Own Car",
};

export const VEHICLE_CAPACITIES: Record<VehicleType, number> = {
  auto: 2,
  cab: 3,
  ownBike: 1,
  ownCar: 3,
};
