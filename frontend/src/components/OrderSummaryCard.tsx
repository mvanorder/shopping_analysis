import { Text, View, StyleSheet } from "react-native";

type OrderSummaryCardProps = {
  retailer: string;
  orderCount: number;
  total: number;
};

export default function OrderSummaryCard({
  retailer,
  orderCount,
  total,
}: OrderSummaryCardProps) {
  const average = orderCount === 0 ? 0 : total / orderCount;
  const label = orderCount === 1 ? "order" : "orders";

  return (
    <View style={styles.card}>
      <Text style={styles.retailer}>{retailer}</Text>
      <Text>
        {orderCount} {label}
      </Text>
      <Text>Total: ${total.toFixed(2)}</Text>
      <Text>Average: ${average.toFixed(2)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 8,
  },
  retailer: {
    fontWeight: "600",
  },
});
