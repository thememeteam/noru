export const COLLEGE_DESTINATION = "College";

export const VEHICLE_OPTIONS = ["auto", "cab", "ownBike", "ownCar"] as const;
export type VehicleType = (typeof VEHICLE_OPTIONS)[number];

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  auto: "Auto",
  cab: "Cab",
  ownBike: "My bike",
  ownCar: "My vehicle",
};

// Options shown in the Host ride form
export const HOST_VEHICLE_OPTIONS = ["auto", "cab", "ownBike", "ownCar"] as const;
export type HostVehicleType = (typeof HOST_VEHICLE_OPTIONS)[number];

// Fixed capacity for vehicles where seats are not user-selectable (undefined = user picks)
export const FIXED_CAPACITY: Record<HostVehicleType, number | null> = {
  auto: 2,
  cab: 3,
  ownBike: 1,
  ownCar: null,
};

export const MY_VEHICLE_SEAT_OPTIONS = [1, 2, 3, 4] as const;
