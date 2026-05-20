import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

const GOOGLE_API_KEY = "AIzaSyDFSnXaNt0AUVA-fo7RgbDOmCh9OWmMOAs";

type Props = { startPoint: string; endPoint: string };

export function RouteMap({ startPoint, endPoint }: Props) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    if (!startPoint || !endPoint) return;
    setStatus("loading");
    setMapUrl(null);

    const go = async () => {
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/directions/json` +
          `?origin=${encodeURIComponent(startPoint)}` +
          `&destination=${encodeURIComponent(endPoint)}` +
          `&key=${GOOGLE_API_KEY}`,
        );
        const data = await res.json();

        if (data.status !== "OK" || !data.routes.length) {
          setStatus("failed");
          return;
        }

        const leg = data.routes[0].legs[0];
        const polyline = encodeURIComponent(data.routes[0].overview_polyline.points);
        const oLat = leg.start_location.lat;
        const oLng = leg.start_location.lng;
        const dLat = leg.end_location.lat;
        const dLng = leg.end_location.lng;

        const url =
          `https://maps.googleapis.com/maps/api/staticmap` +
          `?size=700x360&scale=2` +
          `&path=color:0x1E6CCCff|weight:4|enc:${polyline}` +
          `&markers=size:mid|color:0x3B82F6|${oLat},${oLng}` +
          `&markers=size:mid|color:0x10B981|${dLat},${dLng}` +
          `&style=element:geometry|color:0x1d2c4d` +
          `&style=feature:road|element:geometry|color:0x38414e` +
          `&style=feature:road|element:geometry.stroke|color:0x212a37` +
          `&style=feature:road.highway|element:geometry|color:0x2c6675` +
          `&style=feature:water|element:geometry|color:0x0e1626` +
          `&style=feature:landscape|element:geometry|color:0x0e1d37` +
          `&style=feature:poi|element:labels|visibility:off` +
          `&style=feature:transit|element:labels|visibility:off` +
          `&style=element:labels.text.fill|color:0x8ec3b9` +
          `&style=element:labels.text.stroke|color:0x1a3646` +
          `&key=${GOOGLE_API_KEY}`;

        setMapUrl(url);
        setStatus("ready");
      } catch {
        setStatus("failed");
      }
    };

    void go();
  }, [startPoint, endPoint]);

  const openInMaps = () => {
    const origin = encodeURIComponent(startPoint);
    const destination = encodeURIComponent(endPoint);
    const googleUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    const nativeUrl = Platform.OS === "ios"
      ? `maps://maps.apple.com/?saddr=${origin}&daddr=${destination}`
      : `geo:0,0?q=${destination}`;

    Linking.canOpenURL(nativeUrl)
      .then((can) => Linking.openURL(can ? nativeUrl : googleUrl))
      .catch(() => Linking.openURL(googleUrl));
  };

  if (status === "failed") return null;

  if (status === "loading") {
    return (
      <View style={[mapStyles.container, mapStyles.loadingBox]}>
        <ActivityIndicator size="small" color="#5BA0F2" />
      </View>
    );
  }

  return (
    <Pressable style={mapStyles.container} onPress={openInMaps} accessibilityRole="button" accessibilityLabel="Open route in Maps">
      <Image source={{ uri: mapUrl! }} style={mapStyles.map} resizeMode="cover" />
      <View style={mapStyles.badge}>
        <Text style={mapStyles.badgeText}>Open in Maps</Text>
      </View>
    </Pressable>
  );
}

const mapStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#383838",
  },
  map: {
    height: 180,
  },
  loadingBox: {
    height: 180,
    backgroundColor: "#181E2E",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#383838",
  },
  badgeText: {
    color: "#B8B8B8",
    fontSize: 12,
    fontFamily: "InterBold",
  },
});
