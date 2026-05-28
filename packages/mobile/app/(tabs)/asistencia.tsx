import { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useListaDia, useGuardarAsistencia } from "@/hooks/useAsistencia";
import { Button, Spinner } from "@/components/ui";
import { colors, spacing, fontSize, radius } from "@/theme";

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"];

interface FilaAsistencia {
  NombreBebe: string;
  NombreMadre: string;
  Fase: string;
  Asistencia: "Sí" | "No" | "Justificado";
  Nota: string;
}

export default function Asistencia() {
  const { dia: diaParam } = useLocalSearchParams<{ dia?: string }>();
  const [dia, setDia] = useState(diaParam ?? "");
  const [fecha] = useState(new Date().toISOString().split("T")[0] ?? "");
  const [filas, setFilas] = useState<FilaAsistencia[]>([]);

  const { data: lista, isLoading } = useListaDia(dia || null);
  const guardar = useGuardarAsistencia();

  useEffect(() => {
    if (lista) {
      setFilas(lista.map((r) => ({ ...r, Asistencia: "No", Nota: "" })));
    }
  }, [lista]);

  const toggleAsistencia = (i: number) => {
    setFilas((prev) =>
      prev.map((f, idx) => {
        if (idx !== i) return f;
        const next = f.Asistencia === "No" ? "Sí" : f.Asistencia === "Sí" ? "Justificado" : "No";
        return { ...f, Asistencia: next };
      })
    );
  };

  const handleGuardar = async () => {
    await guardar.mutateAsync({
      fecha: fecha ?? "",
      dia,
      registros: filas.map((f) => ({
        NombreBebe: f.NombreBebe,
        NombreMadre: f.NombreMadre,
        Fase: f.Fase,
        ProgramaMadre: "",
        Edad: "",
        Asistencia: f.Asistencia,
        Ubicacion: "",
        Reporte: "No",
        Nota: f.Nota,
        SituacionEspecifica: "",
        Extras: "",
        NoMatricula: "",
      })),
    });
    Alert.alert("✅ Guardado", `${filas.filter(f => f.Asistencia === "Sí").length} presentes guardados.`);
  };

  const presentes = filas.filter((f) => f.Asistencia === "Sí").length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Asistencia{dia ? ` — ${dia}` : ""}</Text>
          {filas.length > 0 && (
            <Text style={styles.counter}>{presentes}/{filas.length} presentes</Text>
          )}
        </View>
        {filas.length > 0 && (
          <View style={styles.headerBtns}>
            <Button
              label="✅ Todos"
              size="sm"
              variant="secondary"
              onPress={() => setFilas((prev) => prev.map((f) => ({ ...f, Asistencia: "Sí" })))}
            />
            <Button label="Guardar" size="sm" onPress={handleGuardar} loading={guardar.isPending} />
          </View>
        )}
      </View>

      {/* Selector de día */}
      {!dia && (
        <View style={styles.diasRow}>
          {DIAS.map((d) => (
            <TouchableOpacity key={d} onPress={() => setDia(d)} style={styles.diaChip}>
              <Text style={styles.diaChipText}>{d.slice(0, 3)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {isLoading ? (
        <Spinner fullScreen />
      ) : !dia ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyText}>Selecciona un día arriba</Text>
        </View>
      ) : filas.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📋</Text>
          <Text style={styles.emptyText}>Sin participantes para el {dia}</Text>
        </View>
      ) : (
        <FlatList
          data={filas}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => {
            const color =
              item.Asistencia === "Sí" ? colors.success :
              item.Asistencia === "Justificado" ? colors.warning : colors.slate400;
            const bgColor =
              item.Asistencia === "Sí" ? colors.successLight :
              item.Asistencia === "Justificado" ? colors.warningLight : colors.slate50;
            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleAsistencia(index)}
                style={[styles.fila, { backgroundColor: bgColor, borderColor: color + "44" }]}
              >
                <View style={styles.filaInfo}>
                  <Text style={styles.filaNombre}>{item.NombreBebe}</Text>
                  <Text style={styles.filaSubtitle}>{item.NombreMadre} · {item.Fase}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color }]}>
                  <Text style={[styles.badgeText, { color }]}>
                    {item.Asistencia === "Sí" ? "✅ Sí" : item.Asistencia === "Justificado" ? "📋 Just." : "❌ No"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: colors.bg },
  header:       {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: spacing["2xl"], borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerBtns:   { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  title:        { fontSize: fontSize.lg, fontWeight: "700", color: colors.text },
  counter:      { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  diasRow:      { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, padding: spacing.lg },
  diaChip:      {
    paddingVertical: spacing.sm, paddingHorizontal: spacing.lg,
    borderRadius: radius.full, backgroundColor: colors.brandLight, borderWidth: 1, borderColor: colors.brand + "44",
  },
  diaChipText:  { color: colors.brand, fontWeight: "600", fontSize: fontSize.sm },
  empty:        { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyEmoji:   { fontSize: 48, marginBottom: spacing.lg },
  emptyText:    { fontSize: fontSize.base, color: colors.textMuted },
  list:         { padding: spacing.lg, gap: spacing.sm },
  fila:         {
    flexDirection: "row", alignItems: "center", padding: spacing.lg,
    borderRadius: radius.xl, borderWidth: 1,
  },
  filaInfo:     { flex: 1 },
  filaNombre:   { fontSize: fontSize.base, fontWeight: "600", color: colors.text },
  filaSubtitle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  badge:        {
    borderRadius: radius.full, borderWidth: 1,
    paddingVertical: 4, paddingHorizontal: spacing.md,
  },
  badgeText:    { fontSize: fontSize.xs, fontWeight: "600" },
});
