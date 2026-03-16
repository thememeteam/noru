import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#F4F6FB",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centeredWrap: {
    flex: 1,
    justifyContent: "center",
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    backgroundColor: "#F4F6FB",
  },
  boardContent: {
    gap: 16,
    paddingVertical: 16,
    paddingTop: 6,
    paddingBottom: 28,
  },
  pickScreenContainer: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    textAlign: "left",
    color: "#111827",
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: "left",
    color: "#4B5563",
  },
  card: {
    width: "100%",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E4E7EE",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  cameraWrap: {
    borderRadius: 14,
    overflow: "hidden",
  },
  camera: {
    width: "100%",
    height: 340,
    borderRadius: 14,
  },
  buttonRow: {
    gap: 12,
  },
  buttonBase: {
    borderRadius: 12,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  buttonPrimary: {
    backgroundColor: "#b50246",
  },
  buttonSecondary: {
    backgroundColor: "#FCE7F3",
    borderWidth: 1,
    borderColor: "#F9A8D4",
  },
  buttonDanger: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  buttonTextSecondary: {
    color: "#9D174D",
  },
  buttonTextDanger: {
    color: "#B91C1C",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D6DCE7",
    backgroundColor: "#FAFBFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  quickRow: {
    flexDirection: "row",
    gap: 8,
  },
  vehicleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vehicleChip: {
    borderWidth: 1,
    borderColor: "#D6DCE7",
    backgroundColor: "#F8FAFC",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  vehicleChipSelected: {
    borderColor: "#b50246",
    backgroundColor: "#FCE7F3",
  },
  vehicleChipText: {
    color: "#334155",
    fontWeight: "600",
  },
  vehicleChipTextSelected: {
    color: "#9D174D",
  },
  postList: {
    gap: 10,
  },
  postItem: {
    borderWidth: 1,
    borderColor: "#E4E7EE",
    backgroundColor: "#FCFCFF",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  postName: {
    fontWeight: "700",
    color: "#111827",
  },
  postMeta: {
    color: "#334155",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeOpen: {
    backgroundColor: "#DCFCE7",
  },
  badgeFull: {
    backgroundColor: "#FEE2E2",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextOpen: {
    color: "#166534",
  },
  badgeTextFull: {
    color: "#B91C1C",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    backgroundColor: "#b50246",
    borderRadius: 999,
    minWidth: 84,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  profileTopRight: {
    alignSelf: "flex-end",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#F9A8D4",
  },
  profileAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#F9A8D4",
    backgroundColor: "#FCE7F3",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarFallbackText: {
    color: "#9D174D",
    fontWeight: "700",
  },
  profileSignOut: {
    color: "#9D174D",
    fontSize: 12,
    fontWeight: "600",
  },
});
