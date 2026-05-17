import React, { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const GOOGLE_API_KEY = "AIzaSyDFSnXaNt0AUVA-fo7RgbDOmCh9OWmMOAs";

type Suggestion = {
  place_id: string;
  description: string;
  structured_formatting: { main_text: string; secondary_text: string };
};

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  inputStyle?: any;
};

export function PlacesAutocomplete({ value, onChangeText, onFocus, onBlur, placeholder, inputStyle }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_API_KEY}&language=en&components=country:in`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(data.status === "OK" ? (data.predictions ?? []) : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    onChangeText(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchSuggestions(text), 350);
  };

  const handleSelect = (item: Suggestion) => {
    if (blurRef.current) clearTimeout(blurRef.current);
    onChangeText(item.structured_formatting.main_text);
    setSuggestions([]);
  };

  const handleBlur = () => {
    blurRef.current = setTimeout(() => {
      setSuggestions([]);
      onBlur?.();
    }, 200);
  };

  const showList = loading || suggestions.length > 0;

  return (
    <View>
      <TextInput
        style={inputStyle}
        value={value}
        onChangeText={handleChangeText}
        onFocus={onFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        placeholderTextColor="#7B879C"
        autoCorrect={false}
        autoComplete="off"
      />
      {showList && (
        <View style={acStyles.list}>
          {loading && (
            <ActivityIndicator size="small" color="#60A5FA" style={{ paddingVertical: 10 }} />
          )}
          {suggestions.map((item, i) => (
            <Pressable
              key={item.place_id}
              style={[acStyles.item, i < suggestions.length - 1 && acStyles.itemBorder]}
              onPress={() => handleSelect(item)}>
              <Text style={acStyles.itemMain} numberOfLines={1}>
                {item.structured_formatting.main_text}
              </Text>
              {item.structured_formatting.secondary_text ? (
                <Text style={acStyles.itemSub} numberOfLines={1}>
                  {item.structured_formatting.secondary_text}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const acStyles = StyleSheet.create({
  list: {
    backgroundColor: "#32353B",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#4B5563",
    marginTop: 4,
    overflow: "hidden",
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#4B5563",
  },
  itemMain: {
    color: "#E5E7EB",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  itemSub: {
    color: "#9CA3AF",
    fontSize: 12,
    fontFamily: "InterMedium",
    marginTop: 1,
  },
});
