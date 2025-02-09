import { View, Text, StyleSheet } from "react-native";

export default function GroupScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>Groups Screen Placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 18,
  },
});
